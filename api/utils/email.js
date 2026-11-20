const nodemailer = require("nodemailer");

const sendEmail = (to, subject, html, attachments, custom_smtp) => {
    console.log("Servizio mail disabilitato");
    return;
    let smtp = {
        host: "host",
        user: "user",
        pass: "password",
        from: "APP base <app_base@blueday.it>",
    };

    if (custom_smtp?.length) {
        const user = _.find(custom_smtp, { type: "username" });
        const password = _.find(custom_smtp, { type: "password" });
        const host = _.find(custom_smtp, { type: "host" });
        const from = _.find(custom_smtp, { type: "email" });
        smtp = {
            host: host.value,
            user: user.value,
            pass: password.value,
            from: from.value,
        };
    }

    if (sails.config.custom.sendEmail) {
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: 25,
            secure: false, // upgrade later with STARTTLS
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
        });

        var mailOptions = {
            from: smtp.from,
            to,
            subject,
            html,
        };

        if (attachments) {
            mailOptions.attachments = attachments;
        }

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log(
                    "Email sent to " + mailOptions.to + ": " + info.response,
                );
            }
        });
    }
};

module.exports = {
    sendEmail,
};
