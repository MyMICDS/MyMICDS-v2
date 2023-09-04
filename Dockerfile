FROM node:12.18.2

# Copy over file contents
COPY . /app

# Set current working directory to the app
WORKDIR /app

# Install npm dependencies
RUN npm ci

RUN npm run build

ENTRYPOINT [ "npm", "start" ]
