#!/bin/bash

# This is a wrapper script that calls the actual reset script in the scripts/data directory
"$(dirname "$0")/scripts/data/reset-db.sh" "$@" 