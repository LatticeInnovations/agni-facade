const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-json-schema'));
const chaiHttp = require("chai-http")
chai.use(chaiHttp)
const app = require("../app")
let config = require("../config/nodeConfig");

config.lockTimeInMin = 0;
describe('POST /api/v1/auth/login', () => {

        it('should allow login with the given email and password', async () => {
        const response = await chai.request(app).post('/api/v1/auth/login')
        .send({
          "userContact": "tulika@thelattice.in",
          "password": "Lattice@1234"
        });
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property("status");
        expect(response.body.status).to.eql(1);
        expect(response.body.data).to.be.an('object').that.is.not.empty;
    });

    it('should detect invalid email', async () => {
      const response = await chai.request(app).post('/api/v1/auth/login')
      .send({
        "userContact": "tulika@.in",
        "password": "Lattice@1234"
      });
      expect(response.status).to.eql(422);
      expect(response.body).to.have.property("status");
      expect(response.body.status).to.eql(0);
      expect(response.body.data).to.be.an('object').that.is.not.empty;
  });

  it('should not allow login with the given email', async () => {
    const response = await chai.request(app).post('/api/v1/auth/login')
    .send({
      "userContact": "tulika@theattice.in",
      "password": "Lattice@12"
    });
    expect(response.status).to.eql(401);
    expect(response.body).to.have.property("status");
    expect(response.body.status).to.eql(0);
});

it('should not allow login with the given password', async () => {
  const response = await chai.request(app).post('/api/v1/auth/login')
  .send({
    "userContact": "tulika@thelattice.in",
    "password": "Lattice@123"
  });
  expect(response.status).to.eql(401);
  expect(response.body).to.have.property("status");
  expect(response.body.status).to.eql(0);
});

it('should not allow login after multiple incorrect attempts', async () => {
  let response = await checkLimit();
  expect(response.status).to.eql(401);
  expect(response.body).to.have.property("status");
  expect(response.body.status).to.eql(0);
  expect(response.body.message).to.eql("Too many attempts. Please try after 5 mins");
});



});


describe('POST /api/v1/auth/app/user/verify', () => {

  it('should verify the email', async () => {
  const response = await chai.request(app).post('/api/v1/auth/app/user/verify')
  .send({
    "userContact": "tulika@thelattice.in",
  });
  expect(response.status).to.eql(200);
  expect(response.body).to.have.property("status");
  expect(response.body.status).to.eql(1);
  expect(response.body).to.be.an('object').that.is.not.empty;
});
it('should not allow user verification', async () => {
  const response = await chai.request(app).post('/api/v1/auth/app/user/verify')
  .send({
    "userContact": "tulika1@thelattice.in",
  });
  expect(response.status).to.eql(401);
  expect(response.body).to.have.property("status");
  expect(response.body.status).to.eql(0);
  expect(response.body).to.be.an('object').that.is.not.empty;
});

it('should not allow user verification using mobile', async () => {
  const response = await chai.request(app).post('/api/v1/auth/app/user/verify')
  .send({
    "userContact": "8709135849",
  });
  expect(response.status).to.eql(200);
  expect(response.body).to.have.property("status");
  expect(response.body.status).to.eql(1);
});

});


describe('POST /api/v1/auth/setPassword', () => {

  it('should not verify the email', async () => {
  const response = await chai.request(app).post('/api/v1/auth/setPassword')
  .send({
    "userContact": "tulika1@thelattice.in",
    "newPassword": "Lattice@123",
    "otp": "111111"
  });
  expect(response.status).to.eql(401);
  expect(response.body).to.have.property("status");
  expect(response.body.status).to.eql(0);
  expect(response.body).to.be.an('object').that.is.not.empty;
});
it('should have successful otp verification', async () => {
  const response = await chai.request(app).post('/api/v1/auth/setPassword')
  .send({
    "userContact": "tulika@thelattice.in",
    "newPassword": "Lattice@123",
    "otp": "198980"
  });
  expect(response.status).to.eql(401);
  expect(response.body).to.have.property("status");
  expect(response.body.status).to.eql(0);
  expect(response.body).to.be.an('object').that.is.not.empty;
});

it('should not allow otp verification', async () => {
  const response = await chai.request(app).post('/api/v1/auth/setPassword')
  .send({
    "userContact": "tulika@thelattice.in",
    "newPassword": "Lattice@123",
    "otp": "198980"
  });
  expect(response.status).to.eql(401);
  expect(response.body).to.have.property("status");
  expect(response.body.status).to.eql(0);
});

});


async function checkLimit() {
  let responseVal;
  for(let i=0; i<4; i++) {
    responseVal = await chai.request(app).post('/api/v1/auth/login')
    .send({
      "userContact": "tulika@thelattice.in",
      "password": "Lattice@123"
    });
  }
  return responseVal;
}
