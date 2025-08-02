# Bland.ai Environment Setup

This guide explains how to configure Bland.ai API keys using environment variables for better security.

## Setup Instructions

### 1. Create .env file

Create a `.env` file in the `backend/backend/` directory with the following content:

```env
# Bland.ai Configuration
BLAND_API_KEY=org_c2f0830f6ad5370f7564f9ea31aaf486b207e8d6d94eab7f0e3962b3e6955a8e18c7e3b0c596201778ef69
BLAND_PATHWAY_ID=889ab039-29c9-4270-971c-e49fb1c27334
BLAND_PHONE_NUMBER=+917020744317

# API Configuration
BLAND_API_URL=https://api.bland.ai/v1/calls
```

### 2. Update with your values

Replace the values with your actual Bland.ai credentials:

- `BLAND_API_KEY`: Your Bland.ai API key
- `BLAND_PATHWAY_ID`: Your Bland.ai pathway ID
- `BLAND_PHONE_NUMBER`: The phone number to call
- `BLAND_API_URL`: Bland.ai API endpoint (usually doesn't need to change)

### 3. Security Notes

- **Never commit `.env` files to version control**
- The `.env` file is already in `.gitignore`
- Environment variables provide better security than hardcoded values
- Fallback values are provided in `config.py` for development

### 4. Testing

After setting up the environment variables, test the integration:

```bash
cd backend/backend
python test_bland_ai.py
```

### 5. Current Configuration

The current setup uses these default values (from your working example):

- **API Key**: `org_c2f0830f6ad5370f7564f9ea31aaf486b207e8d6d94eab7f0e3962b3e6955a8e18c7e3b0c596201778ef69`
- **Pathway ID**: `889ab039-29c9-4270-971c-e49fb1c27334`
- **Phone Number**: `+917020744317`

## Files Updated

- `config.py`: Added environment variable loading
- `routers/suicide_prevention.py`: Updated to use environment variables
- `test_bland_ai.py`: Updated to use environment variables

## Benefits

1. **Security**: API keys are not hardcoded in source code
2. **Flexibility**: Easy to change configuration without code changes
3. **Environment-specific**: Different values for development/production
4. **Best Practices**: Follows security best practices for API key management 