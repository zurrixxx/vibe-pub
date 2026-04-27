export function out(data, format = 'json') {
  if (format === 'human') {
    if (typeof data === 'string') {
      console.log(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } else {
    console.log(JSON.stringify(data));
  }
}

export function err(message, status = 1) {
  console.log(JSON.stringify({ error: message, status }));
  process.exit(1);
}
