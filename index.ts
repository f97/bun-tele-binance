import ccxt from "ccxt";
import dayjs from "dayjs";
import delay from "delay";
import map from "lodash-es/map";
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "trade.log" }),
  ],
});

const binance = new ccxt.binance({
  apiKey: "yD9EbnDQJPrBzC0PiFrSkU80UbmGpvKDlwVXJmsXjxZjiDEcSPYcZe5D42NoY3rP",
  secret: "Xa4j5XOw1XRHgNjOihV5jm4I8fpybKpODR7FtlSaFnj8ihxUOJ5zEo6O2s6t9JOz",
});
binance.setSandboxMode(true);

const getBalance = async () => {
  const balance: any = await binance.fetchBalance();
  return balance.total;
};

const printBalance = async (pepePrice = 0) => {
  const balance = await getBalance();
  console.log("USDT", `${balance.USDT + balance.PEPE * pepePrice}`);
  logger.log("info", `${balance.USDT + balance.PEPE * pepePrice}`);
};

const getPrices = async (numberOfCandles = 10) => {
  const prices = map(
    await binance.fetchOHLCV("PEPE/USDT", "1m", numberOfCandles),
    (p) => {
      return {
        timestamp: p[0],
        open: p[1],
        high: p[2],
        low: p[3],
        close: p[4],
        volume: p[5],
      };
    }
  );
  return prices;
};

const tick = async () => {
  const balance = await getBalance();
  const prices = await getPrices(3);
  const lastPrice = prices[prices.length - 1].close ?? 0;
  const averagePrice =
    prices.reduce((a, b: any) => a + b.close, 0) / prices.length;

  const TRADE_SIZE = 100;
  let quantity = TRADE_SIZE / lastPrice;

  let direction = lastPrice > averagePrice ? "buy" : "sell";
  const isNotHasBalance =
    direction === "buy" ? balance.USDT > TRADE_SIZE : balance.PEPE > TRADE_SIZE;

  if (isNotHasBalance) {
    direction === "buy" ? (direction = "sell") : (direction = "buy");
    quantity = quantity * 10;
  }
  await binance.createMarketOrder("PEPE/USDT", direction, quantity);
  printBalance(lastPrice);

  // logger.log(
  //   "info",
  //   `${dayjs().format()}: ${direction} ${quantity} PEPE at ${lastPrice}`
  // );
};

const main = async () => {
  while (true) {
    await tick();
    await delay(60 * 1000);
  }
};

main();

const server = Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response("Welcome to Bun!");
  },
});

console.log(`Listening on ${server.url}`);
