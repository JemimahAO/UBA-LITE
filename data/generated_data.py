import json
import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

def generate_user_activity_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    actions = ["login", "file_download", "file_upload", "logout"]

    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "action": random.choice(actions),
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)
    
    return logs

def generate_large_file_transfer_logs(num_transfers, anomaly_ratio=0.2):
    users = [f"user{i}" for i in range(1, 6)]
    destinations = ["cloud_storage", "external_drive", "internal_server"]

    transfers = []
    for _ in range(num_transfers):
        user_id = random.choice(users)
        is_anomaly = random.random() < anomaly_ratio

        if is_anomaly:
            # Very large transfers to more sensitive destinations
            file_size = random.randint(500 * 10**6, 2 * 10**9)  # 500MB - 2GB
            destination = random.choice(["cloud_storage", "external_drive"])
        else:
            # Normal day-to-day transfers
            file_size = random.randint(200 * 10**3, 80 * 10**6)  # 200KB - 80MB
            destination = random.choice(destinations)

        transfer = {
            "user_id": user_id,
            "file_size": file_size,
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
            "destination": destination,
            # Helpful for demos; ML models ignore this column
            "label": "anomalous" if is_anomaly else "normal",
        }
        transfers.append(transfer)

    return transfers

def generate_file_access_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "file_path": f"file_{random.randint(1, 100)}.txt",  # Changed to file_path
            "action": random.choice(["access", "modify", "delete"]),
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)
    
    return logs

def generate_database_access_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "database_name": f"db_{random.randint(1, 10)}",
            "action": random.choice(["read", "write", "delete"]),
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)
    
    return logs

def generate_privileged_access_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "access_level": f"privilege_{random.randint(1, 5)}",  # Changed to access_level
            "action": random.choice(["grant", "revoke", "access"]),
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)
    
    return logs

def generate_legacy_system_access_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "system_name": f"legacy_system_{random.randint(1, 5)}",
            "action": random.choice(["login", "logout", "access"]),
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)
    
    return logs

def generate_departmental_access_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    departments = ["HR", "Finance", "IT", "Marketing"]

    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "department_name": random.choice(departments),  # Changed to department_name
            "action": "access",
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)
    
    return logs

def generate_access_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    resources = ["sensitive_file.txt", "internal_server", "confidential_db"]

    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "resource": random.choice(resources),
            "action": "access",
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)
    
    return logs

def generate_unauthorized_software_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    software_names = ["malicious_tool.exe", "unauthorized_app.msi", "hack_tool.py"]

    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "software_name": random.choice(software_names),
            "device_id": f"device_{random.randint(1, 3)}",  # Added device_id
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)
    
    return logs

def generate_hacking_tools_usage_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    tools = ["nmap", "metasploit", "wireshark"]

    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "tool_name": random.choice(tools),
            "device_id": f"device_{random.randint(1, 3)}",  # Added device_id
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)

    return logs

def generate_command_line_access_logs(num_logs):
    users = [f"user{i}" for i in range(1, 6)]
    commands = ["cmd.exe", "powershell.exe", "bash"]

    logs = []
    for _ in range(num_logs):
        log = {
            "user_id": random.choice(users),
            "command_used": random.choice(commands),  # Changed to command_used
            "device_id": f"device_{random.randint(1, 3)}",  # Added device_id
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        logs.append(log)

    return logs

# New features for data deletion or modification
def generate_mass_deletion_logs(num_logs, anomaly_ratio=0.2):
    users = [f"user{i}" for i in range(1, 6)]
    logs = []
    for _ in range(num_logs):
        user_id = random.choice(users)
        is_anomaly = random.random() < anomaly_ratio

        if is_anomaly:
            file_count = random.randint(200, 1000)
        else:
            file_count = random.randint(1, 80)

        log = {
            "user_id": user_id,
            # Align with train_mass_deletion_model expected field name
            "file_count": file_count,
            "target_directory": f"/home/{user_id}/files/",
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
            "label": "anomalous" if is_anomaly else "normal",
        }
        logs.append(log)
    return logs

def generate_security_log_modification_logs(num_logs, anomaly_ratio=0.2):
    users = [f"user{i}" for i in range(1, 6)]
    logs = []
    for _ in range(num_logs):
        user_id = random.choice(users)
        is_anomaly = random.random() < anomaly_ratio

        if is_anomaly:
            modifications = "Removed multiple entries related to admin logins and failed access attempts"
        else:
            modifications = "Rotated log file and archived old entries"

        log = {
            "user_id": user_id,
            "log_file": "security.log",
            "modifications": modifications,
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
            "label": "anomalous" if is_anomaly else "normal",
        }
        logs.append(log)
    return logs

def generate_database_record_modification_logs(num_logs, anomaly_ratio=0.2):
    users = [f"user{i}" for i in range(1, 6)]
    logs = []
    for _ in range(num_logs):
        user_id = random.choice(users)
        is_anomaly = random.random() < anomaly_ratio

        # Normal changes: small salary adjustments; anomalies: large jumps
        old_salary = random.randint(30_000, 120_000)
        if is_anomaly:
            # Extreme jump
            new_salary = old_salary + random.randint(40_000, 120_000)
        else:
            new_salary = old_salary + random.randint(-5_000, 5_000)

        log = {
            "user_id": user_id,
            "database_name": f"db_{random.randint(1, 10)}",
            "record_id": random.randint(1000, 9999),
            "changes": {
                "field": "salary",
                "old_value": old_salary,
                "new_value": new_salary,
            },
            # Align with train_database_record_alteration_model expected field
            "alteration_time": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
            "label": "anomalous" if is_anomaly else "normal",
        }
        logs.append(log)
    return logs

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

if __name__ == "__main__":
    # Generate and save logs into this repo's data directory
    base_dir = Path(__file__).resolve().parent
    log_generators = {
        "database_access_logs": generate_database_access_logs,
        "privileged_access_logs": generate_privileged_access_logs,
        "legacy_system_access_logs": generate_legacy_system_access_logs,
        "departmental_access_logs": generate_departmental_access_logs,
        "access_logs": generate_access_logs,
        "unauthorized_software_logs": generate_unauthorized_software_logs,
        "hacking_tools_usage_logs": generate_hacking_tools_usage_logs,
        "command_line_access_logs": generate_command_line_access_logs,
        "mass_deletion_logs": generate_mass_deletion_logs,
        "security_log_modification_logs": generate_security_log_modification_logs,
        "database_record_modification_logs": generate_database_record_modification_logs,
    }

    for log_type, generator in log_generators.items():
        logs = generator(80)
        if not logs:
            continue

        fieldnames = sorted({key for log in logs for key in log.keys()})
        out_path = base_dir / f"{log_type}.csv"
        with out_path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(logs)
        print(f"{log_type.replace('_', ' ').title()} generated successfully at {out_path}!")
