import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SEND_GRID_API_KEY);

export const sendWelcomeEmail = (email, name) => {
  sgMail.send({
    from: "dmitry.doroshko.99@gmail.com",
    to: email,
    subject: "Thanks for joining in!",
    text: `Welcome to the app, ${name}. Let me know how you get along with the app.`,
  });
};

export const sendCancellationEmail = (email, name) => {
  sgMail.send({
    from: "dmitry.doroshko.99@gmail.com",
    to: email,
    subject: "Sorry to see you go!",
    text: `Goodbye, ${name}.`,
  });
};
