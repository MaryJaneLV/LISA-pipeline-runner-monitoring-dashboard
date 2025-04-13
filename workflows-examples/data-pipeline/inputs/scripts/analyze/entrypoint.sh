#!/bin/bash
set -e

# Install required packages
if [ -f /tmp/scripts/requirements.txt ]; then
  pip install -r /tmp/scripts/requirements.txt
fi

python /tmp/scripts/script.py