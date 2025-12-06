"""
File parsing utilities to support multiple log formats
"""
import pandas as pd
import json
import re
from pathlib import Path
from typing import Union, List, Dict, Any
from datetime import datetime


def detect_file_format(filename: str) -> str:
    """
    Detect file format based on extension
    
    Args:
        filename: Name of the file
    
    Returns:
        File format (csv, json, log, txt)
    """
    extension = Path(filename).suffix.lower()
    
    format_map = {
        '.csv': 'csv',
        '.json': 'json',
        '.log': 'log',
        '.txt': 'txt',
        '.tsv': 'tsv',
    }
    
    return format_map.get(extension, 'unknown')


def parse_csv_file(file_path: Path) -> pd.DataFrame:
    """Parse CSV file"""
    try:
        df = pd.read_csv(file_path)
        return df
    except Exception as e:
        raise ValueError(f"Error parsing CSV file: {str(e)}")


def parse_tsv_file(file_path: Path) -> pd.DataFrame:
    """Parse TSV (Tab-separated) file"""
    try:
        df = pd.read_csv(file_path, sep='\t')
        return df
    except Exception as e:
        raise ValueError(f"Error parsing TSV file: {str(e)}")


def parse_json_file(file_path: Path) -> pd.DataFrame:
    """Parse JSON file (array of objects or line-delimited JSON)"""
    try:
        # Try standard JSON array first
        df = pd.read_json(file_path)
        return df
    except:
        # Try line-delimited JSON (JSONL/NDJSON format)
        try:
            with open(file_path, 'r') as f:
                lines = f.readlines()
                data = [json.loads(line) for line in lines if line.strip()]
                df = pd.DataFrame(data)
                return df
        except Exception as e:
            raise ValueError(f"Error parsing JSON file: {str(e)}")


def parse_log_file(file_path: Path, log_format: str = 'auto') -> pd.DataFrame:
    """
    Parse .log or .txt files with various formats
    
    Supports:
    - Common log format (Apache/Nginx style)
    - Key-value pairs (key=value or key:value)
    - JSON lines
    - Custom patterns
    
    Args:
        file_path: Path to log file
        log_format: Format hint ('auto', 'apache', 'key_value', 'json_lines')
    
    Returns:
        DataFrame with parsed log entries
    """
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    if not lines:
        raise ValueError("Log file is empty")
    
    # Try to detect format from first few lines
    if log_format == 'auto':
        log_format = detect_log_format(lines[:10])
    
    if log_format == 'json_lines':
        return parse_json_lines(lines)
    elif log_format == 'key_value':
        return parse_key_value_logs(lines)
    elif log_format == 'apache':
        return parse_apache_logs(lines)
    else:
        # Generic line-by-line parsing
        return parse_generic_logs(lines)


def detect_log_format(sample_lines: List[str]) -> str:
    """Detect log format from sample lines"""
    for line in sample_lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if JSON
        if line.startswith('{') and line.endswith('}'):
            try:
                json.loads(line)
                return 'json_lines'
            except:
                pass
        
        # Check if key-value pairs
        if '=' in line or (': ' in line and ',' in line):
            return 'key_value'
        
        # Check if Apache/Common log format
        if re.match(r'^\d+\.\d+\.\d+\.\d+', line):
            return 'apache'
    
    return 'generic'


def parse_json_lines(lines: List[str]) -> pd.DataFrame:
    """Parse JSON lines (JSONL/NDJSON)"""
    data = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            data.append(obj)
        except:
            continue
    
    return pd.DataFrame(data)


def parse_key_value_logs(lines: List[str]) -> pd.DataFrame:
    """
    Parse logs with key-value pairs
    Example: timestamp=2024-01-01 user_id=user123 action=login
    """
    data = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        entry = {}
        
        # Try key=value format
        if '=' in line:
            pairs = re.findall(r'(\w+)=([^\s,]+)', line)
            for key, value in pairs:
                entry[key] = value
        
        # Try key: value format
        elif ': ' in line:
            pairs = re.findall(r'(\w+):\s*([^,\n]+)', line)
            for key, value in pairs:
                entry[key] = value.strip()
        
        if entry:
            data.append(entry)
    
    return pd.DataFrame(data)


def parse_apache_logs(lines: List[str]) -> pd.DataFrame:
    """
    Parse Apache/Nginx common log format
    Example: 127.0.0.1 - user [10/Oct/2000:13:55:36 -0700] "GET /index.html HTTP/1.0" 200 2326
    """
    pattern = r'(\S+) \S+ (\S+) \[([\w:/]+\s[+\-]\d{4})\] "(\S+)\s?(\S+)?\s?(\S+)?" (\d{3}) (\d+|-)'
    
    data = []
    for line in lines:
        match = re.match(pattern, line)
        if match:
            ip, user, timestamp, method, path, protocol, status, size = match.groups()
            data.append({
                'ip_address': ip,
                'user_id': user if user != '-' else None,
                'timestamp': timestamp,
                'method': method,
                'path': path,
                'protocol': protocol,
                'status_code': int(status),
                'size': int(size) if size != '-' else 0
            })
    
    return pd.DataFrame(data)


def parse_generic_logs(lines: List[str]) -> pd.DataFrame:
    """
    Generic parser for unstructured logs
    Creates a simple structure with timestamp extraction if possible
    """
    data = []
    
    # Common timestamp patterns
    timestamp_patterns = [
        r'\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}',  # ISO format
        r'\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2}',       # Apache format
        r'\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}',       # Syslog format
    ]
    
    for idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        entry = {
            'line_number': idx + 1,
            'raw_log': line
        }
        
        # Try to extract timestamp
        for pattern in timestamp_patterns:
            match = re.search(pattern, line)
            if match:
                entry['timestamp'] = match.group(0)
                break
        
        # Try to extract common fields
        if 'user' in line.lower():
            user_match = re.search(r'user[_:\s]*(\w+)', line, re.IGNORECASE)
            if user_match:
                entry['user_id'] = user_match.group(1)
        
        if 'action' in line.lower():
            action_match = re.search(r'action[_:\s]*(\w+)', line, re.IGNORECASE)
            if action_match:
                entry['action'] = action_match.group(1)
        
        data.append(entry)
    
    return pd.DataFrame(data)


def parse_uploaded_file(file_path: Union[str, Path], file_format: str = None) -> pd.DataFrame:
    """
    Main function to parse uploaded files of various formats
    
    Args:
        file_path: Path to the uploaded file
        file_format: Optional format hint (auto-detected if not provided)
    
    Returns:
        DataFrame with parsed data
    
    Raises:
        ValueError: If file format is unsupported or parsing fails
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise ValueError(f"File not found: {file_path}")
    
    # Detect format if not provided
    if not file_format:
        file_format = detect_file_format(file_path.name)
    
    # Parse based on format
    if file_format == 'csv':
        df = parse_csv_file(file_path)
    elif file_format == 'tsv':
        df = parse_tsv_file(file_path)
    elif file_format == 'json':
        df = parse_json_file(file_path)
    elif file_format in ['log', 'txt']:
        df = parse_log_file(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_format}")
    
    # Validate DataFrame
    if df.empty:
        raise ValueError("Parsed file resulted in empty dataset")
    
    return df


def get_supported_formats() -> List[str]:
    """Get list of supported file formats"""
    return ['csv', 'json', 'log', 'txt', 'tsv', 'jsonl', 'ndjson']
