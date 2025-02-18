# Use the official Node.js image
FROM node:16

# Set working directory
WORKDIR /code

# Copy package.json and package-lock.json first
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install
RUN npm install react-daum-postcode
# Copy the rest of the project files
COPY . /code/

# Build the app
RUN npm run build

# Install serve to serve the build
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 3010

# Serve the app
CMD ["serve", "-s", "build", "-l", "3010"]