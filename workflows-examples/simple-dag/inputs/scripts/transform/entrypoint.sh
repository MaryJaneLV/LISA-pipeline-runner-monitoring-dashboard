#!/bin/bash
set -e

# Install required packages
if [ -f /tmp/scripts/requirements.txt ]; then
  pip install -r /tmp/scripts/requirements.txt
else
  pip install numpy==1.24.3
  pip install pandas==1.5.3
fi

export OPERATION="$1"

python /tmp/scripts/script.py
