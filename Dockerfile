FROM node:16

# Copy over file contents
COPY . /app

# Set current working directory to the app
WORKDIR /app

# Install npm dependencies
RUN npm install --legacy-peer-deps

RUN npm run build

ENTRYPOINT [ "npm", "run", "start:watch" ]
# ENTRYPOINT [ "nodemon" ]
# ENTRYPOINT [ "npm", "start" ]
# ENTRYPOINT ["/bin/bash"]
