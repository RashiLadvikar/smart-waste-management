import  Fluvio  from '@fluvio/client';

let fluvio;

async function getFluvioClient() {
  if (!fluvio) {
    fluvio = await Fluvio.connect();
  }
  return fluvio;
}

export async function produceReview(message) {
  const fluvio = await getFluvioClient();
  const producer = await fluvio.topicProducer('reviews');
  await producer.send(null, Buffer.from(message));
}
