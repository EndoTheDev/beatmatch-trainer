# beatmatch-trainer - build for production (arm64 runtime)
# BUILDPLATFORM trick from check-key (ac6d695): npm install + ng build run NATIVE
# on the GitHub runner (amd64, no QEMU emulation - that's what wedged check-key's
# vite build for 6h); only the runtime stage is arm64.
# ponytail: no native deps in package.json (verified), so cross-compiling the build
# stage is safe. Angular 22 CLI writes absolute /dist paths - cp not the output dir.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx ng build && cp -r dist/app/browser dist-out

FROM nginx:alpine
COPY --from=build /app/dist-out /usr/share/nginx/html/tools/beatmatch-trainer
# SPA fallback: angular single route, but keep 404 sane for wrong subpaths
RUN printf 'server { listen 80; root /usr/share/nginx/html; index index.html; location /tools/beatmatch-trainer/ { try_files $uri $uri/ /tools/beatmatch-trainer/index.html; } }\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80