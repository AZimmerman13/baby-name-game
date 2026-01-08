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


def calculate_scores_for_guesses(guesses: list, actual_name: str) -> list:
    """
    Calculate scores for all guesses and return sorted by score.
    Each player can have multiple guessed names - we take their best score.

    Args:
        guesses: List of Guess objects (each with guessed_names array)
        actual_name: The actual baby name

    Returns:
        List of guesses sorted by score (highest first)
    """
    # Calculate score for each guess
    for guess in guesses:
        best_score = 0.0
        best_name = guess.guessed_names[0] if guess.guessed_names else ""

        # Try each guessed name and find the best score
        for guessed_name in guess.guessed_names:
            score = calculate_score(guessed_name, actual_name)
            if score > best_score:
                best_score = score
                best_name = guessed_name

        # Store the best score and which name achieved it
        guess.score = best_score
        guess.best_guess = best_name

    # Sort by score (descending), then by submission time (ascending) for ties
    guesses.sort(key=lambda x: (-x.score, x.submitted_at))

    return guesses
