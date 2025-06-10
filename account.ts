import "dotenv/config";
import { TwitterApi } from "twitter-api-v2";

const xClient = new TwitterApi(`${process.env.TWITTER_BEARER_TOKEN}`);

export default xClient;
