FROM node
MAINTAINER awaterman@salesforce.com
LABEL Description="Vendor=\"Force.com\" Version=\"1.0\""
RUN apt-get update && \
apt-get install -y vim && \
mkdir /home/cookie && \
groupadd -r cookie && useradd -r -g cookie cookie && \
usermod -a -G sudo cookie && \
chown -R cookie:cookie /home/cookie && \
echo "syntax on" >> /home/cookie/.vimrc && \
WORKDIR /home/cookie
USER cookie
ENV term=xterm-256color

