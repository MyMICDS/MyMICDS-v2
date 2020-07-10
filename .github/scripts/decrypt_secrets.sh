#!/bin/bash

openssl aes-256-cbc -K $FILE_DECRYPT_KEY -iv $FILE_DECRYPT_IV -in .github/secrets/id_rsa.enc -out .github/secrets/id_rsa -d
openssl aes-256-cbc -K $FILE_DECRYPT_KEY -iv $FILE_DECRYPT_IV -in .github/secrets/config.libs.ts.enc -out src/libs/config.ts -d
openssl aes-256-cbc -K $FILE_DECRYPT_KEY -iv $FILE_DECRYPT_IV -in .github/secrets/config.test.ts.enc -out test/config.ts -d
