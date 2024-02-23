FROM sym_node
MAINTAINER Jeff Platzer <jplatzer@symbioticsecurity.com>

RUN mkdir -p /usr/src/app/src
WORKDIR /usr/src/app/src

COPY package.json /usr/src/app/src/
RUN npm install

COPY webpack.config.js .babelrc /usr/src/app/src/
COPY server/src /usr/src/app/src/
COPY audit /usr/src/app/audit/
COPY client/build/dashboard.js /usr/src/app/src/app_server/public/

# Run create a webapp user and files directory
RUN groupadd -r webapp \
   && useradd -m -r -g webapp webapp \
   && mkdir -p /usr/src/app/temp \
   && chown webapp:webapp /usr/src/app/temp

ENV NODE_ENV production

EXPOSE 3080

