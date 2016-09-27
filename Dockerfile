FROM node
MAINTAINER awaterman@salesforce.com
LABEL Description="Vendor=\"Salesforce.com\" Version=\"1.0\""
RUN apt-get update && \
apt-get install -y vim && \
mkdir /home/cookie && \
groupadd -r cookie && useradd -r -g cookie cookie && \
usermod -a -G sudo cookie && \
chown -R cookie:cookie /home/cookie && \
chmod -R a+w /usr/local/lib/node_modules && \
chmod -R a+w /usr/local/bin
WORKDIR /home/cookie
USER cookie
RUN npm install -g istanbul
ENV term=xterm-256color

