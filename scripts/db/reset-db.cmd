@echo off
:: This is a wrapper script that calls the actual reset script in the scripts/data directory
"%~dp0scripts\data\reset-db.cmd" %* 