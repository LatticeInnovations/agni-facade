module.exports = [
    {
        notification_type_id: 1,
        subject: 'Agni - authentication OTP',
        files : [],
        content: `Hello %s,
        <br>
         Please use OTP %s for authentication in agni App.`
    },
    {
        notification_type_id: 2,
        subject: 'Appointment reminder',
        files : [],
        content: `Dear %s, <br>
        You have an appointment in %s on %s at %s.`
    }

];