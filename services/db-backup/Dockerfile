FROM postgres:16-alpine

# Install AWS CLI (for S3-compatible R2 uploads) and bash
RUN apk add --no-cache \
    python3 \
    py3-pip \
    bash \
    curl \
    && pip3 install --break-system-packages awscli \
    && rm -rf /var/cache/apk/*

WORKDIR /app
COPY backup.sh .
RUN chmod +x backup.sh

CMD ["bash", "backup.sh"]
