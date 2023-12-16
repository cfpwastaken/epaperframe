# FROM alpine:3.19
# FROM node:20.10.0-bookworm
FROM node:20.10.0-alpine3.19

# Install dependencies
RUN apk update && apk add --no-cache \
	gimp g++
# RUN apt update && apt install gimp -y

# Copy files
COPY . /app
COPY converttoepaper.scm /usr/share/gimp/2.0/scripts/converttoepaper.scm
COPY Waveshare-7-Color.gpl /usr/share/gimp/2.0/palettes/Waveshare-7-Color.gpl

# Set working directory
WORKDIR /app

# Compile converterTo7Color
RUN g++ -o converterto7color converterTo7color/converterTo7color.cpp

# Install dependencies
# RUN npm install

# Expose port
EXPOSE 6957

# Run app
CMD ["node", "server.js", "pic.raw"]