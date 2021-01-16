const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const mongoose = require("./db/mongoose");
const dotenv = require("dotenv").config();
const cors = require("cors");
const { userRouter, bookingRouter, roomRouter } = require("./routes");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  addUserToRoom,
  addRoom,
  getAllAvailableRooms,
  removeRoom,
} = require("./utils/users");

const router = require("./router");
const Room = require("./models/room");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());
app.use(cors());
app.use("/api/users", userRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/room", roomRouter);
app.use(router);

io.origins(["*:*"]);
io.on("connect", (socket) => {
  io.emit("waitingList", {
    rooms: getAllAvailableRooms(),
  });

  console.log("got here");
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`,
    });

    console.log("userData is:", {
      id: socket.id,
      user: user.name,
      room: user.room,
    });

    socket.emit("userData", {
      id: socket.id,
      name: user.name,
      room: user.room,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    // callback();
  });

  socket.on("sendMessage", ({ userData, message }, callback) => {
    console.log(socket.id);
    console.log("user ==>", userData);
    console.log(message);
    const allUsers = getUsersInRoom(userData.room);
    console.log("all users: ", allUsers);

    io.to(userData.room).emit("message", {
      user: userData.name,
      text: message,
      userData: userData,
    });
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server has started on ${PORT}`));

// addUserToRoom({
//   roomId: "6002d8c3955a2830a168d9cf",
//   userId: "5ff46dbf9f78783948965f79",
// });
