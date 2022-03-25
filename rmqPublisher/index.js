var amqp = require("amqplib/callback_api");

let env = {
    Rab_user: "",
    Rab_password: "",
    Rab_exchangeIP: "",
};
amqp.connect(`amqp://${env.Rab_user}:${env.Rab_password}@${env.Rab_exchangeIP}`, function (error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        var queue = "testing";
        var msg = "Hello World!";

        channel.assertQueue(queue, {
            durable: true,
        });
        channel.sendToQueue(queue, Buffer.from(msg));

        console.log(" [x] Sent %s", msg);
    });
    setTimeout(function () {
        connection.close();
        process.exit(0);
    }, 500);
});