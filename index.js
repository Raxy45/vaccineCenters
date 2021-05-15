const express = require("express");
const app = express();
var rawCenters = require(__dirname + "/getCentersFromAPI.js");
var notifications = require(__dirname + "/sendNotifications.js");
var returnAvailableCenters = require(__dirname + "/returnAvailableCenters.js");
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));

const dataUsers = require("./dataUsers.js");
const axios = require("axios");

app.post("/addUser", (req, res) => {
  let temporaryUser = new dataUsers({
    name: req.body.name,
    number: req.body.number,
    email: req.body.email,
    minimumAge: req.body.minimumAge,
    pincode: req.body.pincode,
    notificationsCount: 0,
  });
  temporaryUser.save(function (err, doc) {
    if (err) {
      return console.error(err);
    }
    console.log("User is added to Database successfully");
  });
});
app.post("/unsubscribeUser", (req, res) => {
  dataUsers.findOne({ number: req.body.number }, (err, user) => {
    // console.log(user);
    notifications.sendEmailUnsubcribe(user).then(() => {
      dataUsers.deleteMany({ number: req.body.number }, (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Deleted the user successfully");
        }
      });
    });
  });
});
app.listen(3000, () => {
  console.log("Started");
  // OP();
});

function traceAvailableCentersEvery10Minutes() {
  dataUsers.find((err, users) => {
    if (err) {
      console.log(err);
    } else {
      users.forEach((user) => {
        var rawCentersArray = [];
        var availableCenters = [];
        rawCenters(user.pincode).then((data) => {
          if (rawCentersArray.length == 0 && availableCenters.length == 0) {
            rawCentersArray = data;
            availableCenters = returnAvailableCenters(user, rawCentersArray);
            rawCentersArray.length = 0;
            if (availableCenters.length > 0) {
              notifications.sendEmail(user, availableCenters).then(() => {
                dataUsers.updateOne(
                  { _id: user._id },
                  { notificationsCount: user.notificationsCount + 1 },
                  (err) => {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log(
                        "Notification sent successfully to user and updated count in Database as well"
                      );
                    }
                  }
                );
              });
              availableCenters.length = 0;
            }
          }
        });
      });
    }
  });
}
setInterval(traceAvailableCentersEvery10Minutes, 10 * 60000);
