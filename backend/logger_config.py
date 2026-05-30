"""
Enhanced logging configuration for BudgetIQ backend
"""
import logging
import os
import sys
from datetime import datetime

# Create logs directory if it doesn't exist
LOGS_DIR = 'logs'
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

# Configure logging with UTF-8 encoding
log_filename = os.path.join(LOGS_DIR, f'budgetiq_{datetime.now().strftime("%Y%m%d")}.log')

# File handler with UTF-8 encoding
file_handler = logging.FileHandler(log_filename, encoding='utf-8')

# Stream handler with UTF-8 support for Windows
if sys.platform == 'win32':
    # For Windows, use errors='ignore' to skip emoji characters that can't be encoded
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
else:
    stream_handler = logging.StreamHandler()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[file_handler, stream_handler]
)

logger = logging.getLogger(__name__)

# Configure stream handler to ignore encoding errors
for handler in logger.handlers:
    if isinstance(handler, logging.StreamHandler):
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

def log_request(method, path, status_code):
    """Log API requests"""
    logger.info(f"{method} {path} - Status: {status_code}")

def log_error(error_or_type, message=None, context=None):
    """Log errors with flexible signature:
    - log_error("some message")
    - log_error("Type", "some message")
    Optionally pass context as third arg.
    """
    if message is None:
        error_type = 'Error'
        error_message = str(error_or_type)
    else:
        error_type = str(error_or_type)
        error_message = str(message)

    context_str = f" - Context: {context}" if context else ""
    logger.error(f"{error_type}: {error_message}{context_str}")

def log_info(message):
    """Log info messages"""
    logger.info(message)
