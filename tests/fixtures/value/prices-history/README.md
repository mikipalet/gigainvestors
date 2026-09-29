# Calibration monthly prices

`CALIB.US.json` is a synthetic monthly-close fixture in trading currency.
September closes rise from 100 in FY2013 to 200 in FY2023. With 10 diluted
shares, year-end market capitalization rises by 1,000 against 800 retained
earnings. The unrelated December 2023 close of 999 catches use of calendar
year-end prices instead of the fiscal-end month. The integration test also
scales these prices into GBX to verify conversion back to GBP reporting units.
