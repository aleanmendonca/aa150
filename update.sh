#!/bin/bash
echo "Updating AutoAtende, please wait."
pm2 stop all
git pull
cd backend
npm i
rm -rf dist
npm run build
npx sequelize db:migrate
cd ../frontend
npm i --legacy-peer-deps
rm -rf build
npm run build
pm2 restart all
echo "Update finished. Enjoy!"
