from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

def analyze_sentiment(transcript):
    """Analyze sentiment using VADER model."""
    analyzer = SentimentIntensityAnalyzer()
    sentiment_scores = []
    lines = transcript.split('.')

    for i, line in enumerate(lines):
        if line.strip():
            sentiment = analyzer.polarity_scores(line)
            sentiment_scores.append({
                'line': line,
                'score': sentiment['compound'],  # Compound sentiment score
                'time': i * 10  # Rough estimation, adjust if needed
            })

    # Return top N emotionally intense lines
    sentiment_scores.sort(key=lambda x: abs(x['score']), reverse=True)
    return sentiment_scores[:5]
