
function log(level, message) {
    console.log(level, message);
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
    }).catch(e => console.log('error sending to discord', e));
}

module.exports.debug = (message) => log('Debug', message);
module.exports.log = (message) => log('Info', message);
module.exports.info = (message) => log('Info', message);
module.exports.warn = (message) => log('Warn', message);
module.exports.error = (message) => log('Error', message);

// might need a simple queue to handle multiple requests
module.exports.discord = (level, message) => {
    setTimeout(() => {
        console.log(level, message);
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
