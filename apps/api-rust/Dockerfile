FROM rust:1.85 AS builder
WORKDIR /app
COPY Cargo.toml ./
COPY Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/solarops-api /usr/local/bin/solarops-api
EXPOSE 8080
CMD ["solarops-api"]
