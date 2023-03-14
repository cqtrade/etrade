
// might need a simple queue to handle multiple requests
module.exports.discord = (level, message) => {
    setTimeout(() => {
        const url = process.env.DISCORD_WEBHOOK_URL;
        const data = {
            content: message,
        };
        fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        }).catch();
    }, 0);
}
