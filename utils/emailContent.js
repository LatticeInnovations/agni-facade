module.exports = [
    {
        notification_type_id: 1,
        subject: 'Agni - authentication OTP',
        files : [],
        content: `Hello %s,
        <br>
         Please use OTP %s to login to the Agni App.`
    },
    {
        notification_type_id: 2,
        subject: 'Appointment reminder',
        files : [],
        content: `Dear %s, <br>
        You have an appointment in %s on %s at %s.`
    },
    {
        notification_type_id: 3,
        subject: 'MDR Account created',
        files : [],
        content: `Dear %s, <br>
        Your account has been created on MDR. Your temporary password is %s. Please click on the below link to login`
    },
    {
        notification_type_id: 4,
        subject: 'MDR forgot Password',
        files : [],
        content: `Dear %s, <br>
        Please click on the below link to reset your password using OTP %s
        %s`
    }

];