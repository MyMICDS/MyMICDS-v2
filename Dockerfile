FROM node:16

# Copy over file contents
COPY . /app

# Set current working directory to the app
WORKDIR /app

# Install npm dependencies
RUN npm install --legacy-peer-deps

ENTRYPOINT [ "npm", "start" ]
# ENTRYPOINT ["/bin/bash"]
