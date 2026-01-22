from rapidfuzz import fuzz
import jellyfish


def normalize_name(name: str) -> str:
    """Normalize name for comparison (lowercase, strip whitespace)"""
    return name.lower().strip()


def calculate_score(guessed_name: str, actual_name: str) -> float:
    """
    Calculate score for a guessed name using multiple algorithms.

    Scoring system:
    - Exact match: 100 points
    - Phonetic match: 75 points
    - High string similarity (>80%): 50 points
    - Moderate similarity (>60%): 25 points
    - Bonus points:
      * +10 for matching first letter
      * +5 for matching name length

    Args:
        guessed_name: The name guessed by the player
        actual_name: The actual baby name

    Returns:
        Score between 0 and 100
    """
    # Normalize names
    guess_norm = normalize_name(guessed_name)
    actual_norm = normalize_name(actual_name)

    # Exact match
    if guess_norm == actual_norm:
        return 100.0

    # Calculate various similarity metrics
    # 1. Levenshtein distance (using rapidfuzz ratio)
    levenshtein_ratio = fuzz.ratio(guess_norm, actual_norm)

    # 2. Jaro-Winkler similarity (good for short strings like names)
    jaro_winkler = jellyfish.jaro_winkler_similarity(guess_norm, actual_norm) * 100

    # 3. Phonetic matching using Metaphone
    metaphone_guess = jellyfish.metaphone(guess_norm)
    metaphone_actual = jellyfish.metaphone(actual_norm)
    phonetic_match = metaphone_guess == metaphone_actual

    # Base score calculation
    score = 0.0

    # Phonetic match gets high score
    if phonetic_match:
        score = 75.0
    else:
        # Weighted combination of string similarity metrics
        # Jaro-Winkler is weighted higher for names
        combined_similarity = (jaro_winkler * 0.6) + (levenshtein_ratio * 0.4)

        if combined_similarity > 80:
            score = 50.0
        elif combined_similarity > 60:
            score = 25.0
        else:
            # Even low similarity gets some points based on the similarity
            score = combined_similarity * 0.2  # Max 12 points for 60% similarity

    # Bonus points
    # Matching first letter
    if guess_norm[0] == actual_norm[0]:
        score += 10.0

    # Matching name length (within 1 character)
    length_diff = abs(len(guess_norm) - len(actual_norm))
    if length_diff == 0:
        score += 5.0
    elif length_diff == 1:
        score += 2.5

    # Cap at 99.99 (exact match is 100)
    return min(score, 99.99)


def calculate_date_score(guessed_date, actual_date) -> float:
    """
    Calculate score for birth date guess based on days difference.
    Perfect guess = 100 points, decreases by 5 points per day difference.

    Args:
        guessed_date: The guessed birth date
        actual_date: The actual birth date

    Returns:
        Score between 0 and 100
    """
    if guessed_date is None or actual_date is None:
        return 0.0

    # Calculate days difference
    days_diff = abs((actual_date - guessed_date).days)

    # Perfect match
    if days_diff == 0:
        return 100.0

    # Decrease by 5 points per day, minimum 0
    score = max(0, 100 - (days_diff * 5))
    return float(score)


def calculate_sex_score(guessed_sex: str, actual_sex: str) -> float:
    """
    Calculate score for sex guess (binary - either correct or not).
    Max 50 points to reduce penalty for wrong guess on 50/50 category.

    Args:
        guessed_sex: The guessed sex
        actual_sex: The actual sex

    Returns:
        50 for correct, 0 for incorrect
    """
    if guessed_sex is None or actual_sex is None:
        return 0.0

    guess_norm = normalize_name(guessed_sex)
    actual_norm = normalize_name(actual_sex)

    return 50.0 if guess_norm == actual_norm else 0.0


def calculate_time_score(guessed_time, actual_time) -> float:
    """
    Calculate score for birth time guess based on minutes difference.
    Perfect guess = 100 points, decreases by 1 point per 10 minutes.

    Args:
        guessed_time: The guessed birth time
        actual_time: The actual birth time

    Returns:
        Score between 0 and 100
    """
    if guessed_time is None or actual_time is None:
        return 0.0

    # Convert times to minutes since midnight
    guess_minutes = guessed_time.hour * 60 + guessed_time.minute
    actual_minutes = actual_time.hour * 60 + actual_time.minute

    # Calculate minutes difference
    minutes_diff = abs(actual_minutes - guess_minutes)

    # Perfect match
    if minutes_diff == 0:
        return 100.0

    # Decrease by 1 point per 10 minutes, minimum 0
    score = max(0, 100 - (minutes_diff / 10))
    return float(score)


def calculate_weight_score(guessed_weight: float, actual_weight: float) -> float:
    """
    Calculate score for weight guess based on pounds difference.
    Perfect guess = 100 points, decreases by 10 points per pound.

    Args:
        guessed_weight: The guessed weight in pounds
        actual_weight: The actual weight in pounds

    Returns:
        Score between 0 and 100
    """
    if guessed_weight is None or actual_weight is None:
        return 0.0

    # Calculate pounds difference
    pounds_diff = abs(actual_weight - guessed_weight)

    # Perfect match (within 0.1 pounds)
    if pounds_diff < 0.1:
        return 100.0

    # Decrease by 10 points per pound, minimum 0
    score = max(0, 100 - (pounds_diff * 10))
    return float(score)


def calculate_custom_score(guessed_value: str, actual_value: str) -> float:
    """
    Calculate score for custom category using string similarity (like name scoring).

    Args:
        guessed_value: The guessed custom value
        actual_value: The actual custom value

    Returns:
        Score between 0 and 100
    """
    if guessed_value is None or actual_value is None:
        return 0.0

    # Use the same algorithm as name scoring
    return calculate_score(guessed_value, actual_value)


def calculate_scores_for_guesses(guesses: list, pool) -> list:
    """
    Calculate scores for all guesses across all enabled categories.
    Each player can have multiple guessed names - we take their best score for names.
    Total score is the sum of all enabled category scores.

    Args:
        guesses: List of Guess objects
        pool: Pool object with actual values and enabled categories

    Returns:
        List of guesses sorted by total score (highest first)
    """
    # Calculate score for each guess
    for guess in guesses:
        # Name scoring (if enabled)
        guess.name_score = None
        guess.best_guess = None
        if pool.enable_name and pool.baby_name:
            best_name_score = 0.0
            best_name = guess.guessed_names[0] if guess.guessed_names else ""

            # Try each guessed name and find the best score
            for guessed_name in guess.guessed_names:
                score = calculate_score(guessed_name, pool.baby_name)
                if score > best_name_score:
                    best_name_score = score
                    best_name = guessed_name

            # Store the best name score
            guess.name_score = best_name_score
            guess.best_guess = best_name

        # Calculate scores for other categories if enabled
        guess.date_score = None
        if pool.enable_date and pool.birth_date:
            guess.date_score = calculate_date_score(guess.guessed_birth_date, pool.birth_date)

        guess.sex_score = None
        if pool.enable_sex and pool.sex:
            guess.sex_score = calculate_sex_score(guess.guessed_sex, pool.sex)

        guess.time_score = None
        if pool.enable_time and pool.birth_time:
            guess.time_score = calculate_time_score(guess.guessed_birth_time, pool.birth_time)

        guess.weight_score = None
        if pool.enable_weight and pool.weight:
            guess.weight_score = calculate_weight_score(guess.guessed_weight, pool.weight)

        guess.custom_score = None
        if pool.enable_custom and pool.custom_value:
            guess.custom_score = calculate_custom_score(guess.guessed_custom_value, pool.custom_value)

        # Calculate total score (sum of all non-None scores)
        total = 0.0
        if guess.name_score is not None:
            total += guess.name_score
        if guess.date_score is not None:
            total += guess.date_score
        if guess.sex_score is not None:
            total += guess.sex_score
        if guess.time_score is not None:
            total += guess.time_score
        if guess.weight_score is not None:
            total += guess.weight_score
        if guess.custom_score is not None:
            total += guess.custom_score

        guess.total_score = total

    # Sort by total score (descending), then by submission time (ascending) for ties
    guesses.sort(key=lambda x: (-x.total_score, x.submitted_at))

    return guesses
