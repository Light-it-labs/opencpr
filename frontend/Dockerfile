FROM node:24-alpine AS build

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL
ARG VITE_PUBLIC_URL
ARG VITE_APP_ENV=production
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_TRACE_PROPAGATION_TARGET_REGEX
ENV VITE_API_URL=$VITE_API_URL \
    VITE_PUBLIC_URL=$VITE_PUBLIC_URL \
    VITE_APP_ENV=$VITE_APP_ENV \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_SENTRY_TRACE_PROPAGATION_TARGET_REGEX=$VITE_SENTRY_TRACE_PROPAGATION_TARGET_REGEX

RUN pnpm build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
