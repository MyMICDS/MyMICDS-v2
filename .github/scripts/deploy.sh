#!/bin/bash

eval "$(ssh-agent -s)"
chmod 600 .github/secrets/id_rsa
ssh-add .github/secrets/id_rsa

ssh apps@$IP -p $PORT <<EOF
  cd $DEPLOY_DIR
  git pull
  npm ci
  pm2 restart mymicds mymicds-tasks --silent
EOF
