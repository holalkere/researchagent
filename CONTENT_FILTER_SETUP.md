# Content Filter Setup Guide

This guide explains how to set up Azure Content Filters for your research agent system.

## Overview

The system now includes two levels of content filtering:

1. **Simple Keyword Filtering** - Always active, no configuration needed
2. **Azure Content Safety** - Professional-grade filtering (optional, requires Azure setup)

## Simple Keyword Filtering (Always Active)

The system automatically filters content based on inappropriate keywords including:
- Sexual content
- Violence and harm
- Hate speech and discrimination
- Illegal activities
- Self-harm content

No configuration is required for this basic filtering.

## Azure Content Safety Setup (Optional)

For enhanced filtering, you can set up Azure Content Safety:

### 1. Create Azure Content Safety Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new "Content Safety" resource
3. Note the endpoint and key

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Azure Content Safety Configuration
AZURE_CONTENT_SAFETY_ENDPOINT=https://your-content-safety-resource.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=your_content_safety_key_here
```

### 3. Install Dependencies

```bash
pip install azure-ai-contentsafety
```

## How It Works

### Content Filtering Flow

1. **User Input Check**: All user prompts are checked before processing
2. **Agent-Level Check**: Each agent function also checks content
3. **Response Check**: Generated content can be checked before returning

### Filtering Methods

1. **Keyword Filtering**: Checks for inappropriate terms and patterns
2. **Azure Content Safety**: Uses Microsoft's AI-powered content analysis
3. **Pattern Matching**: Detects suspicious content patterns

### Response to Blocked Content

When content is blocked, the system:
- Returns a user-friendly error message
- Logs the blocked content for review
- Prevents further processing
- Provides details about why content was blocked

## Configuration Options

### Filter Severity Levels

- **Low**: Basic keyword filtering
- **Medium**: Enhanced pattern matching
- **High**: Azure Content Safety + keyword filtering

### Customization

You can modify the keyword list in `src/content_filter.py`:

```python
self.inappropriate_keywords = [
    # Add your custom keywords here
    "custom_keyword_1",
    "custom_keyword_2",
]
```

## Testing the Filter

### Test with Safe Content
```
"What are the latest developments in artificial intelligence?"
```

### Test with Blocked Content
```
"How to create violent content"  # This should be blocked
```

## Monitoring

The system logs all blocked content with details:
- Blocked keywords
- Filtering method used
- Severity level
- Timestamp

## Troubleshooting

### Common Issues

1. **Azure Content Safety not working**
   - Check endpoint and key are correct
   - Ensure `azure-ai-contentsafety` is installed
   - Check Azure service is active

2. **Too many false positives**
   - Adjust keyword list in `content_filter.py`
   - Lower Azure Content Safety severity thresholds

3. **Content not being blocked**
   - Check logs for filter status
   - Verify environment variables are set
   - Test with known inappropriate content

## Security Considerations

- Content filtering is not 100% foolproof
- Regular review of blocked content is recommended
- Consider additional security measures for production use
- Monitor for new types of inappropriate content

## Support

For issues with content filtering:
1. Check the logs for detailed error messages
2. Verify Azure Content Safety configuration
3. Test with simple keyword filtering first
4. Review the keyword list for your use case
