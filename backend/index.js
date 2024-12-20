//-------------------DATABASE SETUP------------------------------------
require('dotenv').config();

var express = require("express");
var cors = require("cors");
var app = express();
var bodyParser = require("body-parser");

// MongoDB
const path = require('path');
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const url = "mongodb://127.0.0.1:27017";
const dbName = "animelist";
const client = new MongoClient(url);
const db = client.db(dbName);
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const authMiddleware = require('./authMiddleware');
const multer = require("multer");
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); 

app.use(cors());
app.use(bodyParser.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

const port = "8081";
const host = "localhost";

app.post('/graphql', async (req, res) => {
    const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
});

app.listen(port, () => {
    console.log("App listening at http://%s:%s", host, port);
    console.log(`Proxy server is running at http://localhost:${port}`);

});

// This deletes the activites every month
cron.schedule('0 0 1 * *', async () => {
    let oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getUTCMonth() - 1); 
    oneMonthAgo.setUTCHours(0, 0, 0, 0);  

    try {
        await client.connect();
        const db = client.db(dbName);
        console.log(`Deleting activities older than: ${oneMonthAgo}`); 

        const deleteResult = await db.collection('activities').deleteMany({
            timestamp: { $lt: oneMonthAgo }
        });

        console.log(`${deleteResult.deletedCount} old activities deleted.`);
    } catch (error) {
        console.error('Error deleting old activities: ', error);
    } finally {
        await client.close();
    }
});

//----------------------MULTER CONFIGURATION-----------------------------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './images'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({ storage: storage });

//----------------------ROUTERS AND API CALLS------------------------------
app.get("/allUsers", async (req, res) => {
    try {
        await client.connect();
        const results = await db
            .collection("users")
            .find({})
            .limit(100)
            .toArray();

        console.log(results);
        res.status(200).send(results);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching users");
    }
});

app.get("/userById/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();
        const db = client.db(dbName);

        // Convert the userId string to ObjectId
        const userObjectId = new ObjectId(userId);

        // Find the user document by _id
        const user = await db.collection('users').findOne({ _id: userObjectId });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return the user document
        res.status(200).json(user);
    } catch (error) {
        console.error('Error getting user by ID:', error);
        res.status(500).json({ message: "A server error occurred" });
    } finally {
        // Close the connection after the operation
        await client.close();
    }
});

app.get("/getFavoriteAnimes/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();

        const userObjectId = new ObjectId(userId);
        const user = await db.collection('users').findOne({ _id: userObjectId });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Return the list of favorite animes
        res.status(200).json({ favoriteAnimes: user.favoriteAnimes || [] });
    } catch (error) {
        console.error('Error getting user favorites:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.get("/getFollowing/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();

        const userObjectId = new ObjectId(userId);
        const user = await db.collection('users').findOne({ _id: userObjectId });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const followingIDs = user.following || [];

        if (followingIDs.length === 0) {
            return res.status(200).json({ following: [] });
        }

        const followingUsers = await db.collection('users')
        .find({ _id: { $in: followingIDs.map(id => new ObjectId(id)) } })
        .toArray();

        res.status(200).json({ following: followingUsers });


    } catch (error) {
        console.error('Error getting following:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.get("/getFollowers/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();

        const userObjectId = new ObjectId(userId);
        const user = await db.collection('users').findOne({ _id: userObjectId });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const followersIDs = user.followers || [];

        if (followersIDs.length === 0) {
            return res.status(200).json({ followers: [] });
        }

        const followerUsers = await db.collection('users')
        .find({ _id: { $in: followersIDs.map(id => new ObjectId(id)) } })
        .toArray();

        res.status(200).json({ followers: followerUsers });


    } catch (error) {
        console.error('Error getting followers or following:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.get("/getBlocked/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();

        const userObjectId = new ObjectId(userId);
        const user = await db.collection('users').findOne({ _id: userObjectId });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const blockIDs = user.blockedUsers || [];

        if (blockIDs.length === 0) {
            return res.status(200).json({ following: [] });
        }

        const blockedUsers2 = await db.collection('users')
        .find({ _id: { $in: blockIDs.map(id => new ObjectId(id)) } })
        .toArray();

        res.status(200).json({ blockedUsers: blockedUsers2 });


    } catch (error) {
        console.error('Error getting following:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.get('/activityFeed/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();

        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const followingIDs = user.following || [];
        const userObjectId = new ObjectId(userId);

        // Using aggregation to fetch activities with user details
        const activities = await db.collection('activities')
            .aggregate([
                {
                    // Check if this is based on whether the user is following or requesting.
                    $match: {
                        $or: [
                            { targetUserId: userObjectId, type: { $in: ['follow', 'followRequest'] } },
                            { userId: { $in: followingIDs.map(id => new ObjectId(id)) }, type: 'addFavoriteAnime' }
                        ]
                    }
                },
                {   // Gets the lastest information
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                {
                    $unwind: '$userDetails' // Unwind the userDetails array
                },
                {
                    $project: {
                        userId: 1,
                        type: 1,
                        animeId: 1,
                        animeTitle: 1,
                        animeImage: 1,
                        mainName: '$userDetails.username', // Get the username
                        mainPfp: '$userDetails.profilePicture', // Get the profile picture
                        timestamp: 1,
                        targetUserId: 1 // Include targetUserId if needed
                    }
                },
                {
                    $sort: { timestamp: -1 } // Sort by most recent activities
                }
            ])
            .toArray();

        console.log(followingIDs);
        console.log(activities);

        res.status(200).json({ activities });
    } catch (error) {
        console.error('Error fetching activity feed:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        await client.connect();

        // Find the user by email
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Compare the provided password with the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            {
                userId: user._id, email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h'
            }
        );

        // If login is successful, you can return a success message or token (if implementing JWT)
        res.status(200).json({ message: "Login successful",
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            token
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.post('/register', upload.single('profilePic'), async (req, res) => {
    const { username, email, favoriteAnimes, password } = req.body;

    try {
        await client.connect();

        // Check if the user already exists
        const existingUser = await db.collection('users').findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash the password before saving it
        const hashedPassword = await bcrypt.hash(password, 10);

        //const verificationToken = crypto.randomBytes(32).toString('hex');

        // Save the new user to the database
        await db.collection('users').insertOne({
            username,
            email,
            profilePicture: req.file ? `http://localhost:8081/images/${req.file.filename}` : "https://static.vecteezy.com/system/resources/previews/009/292/244/original/default-avatar-icon-of-social-media-user-vector.jpg",
            bio: "",
            favoriteAnimes: favoriteAnimes || [],
            followers: [],
            following: [],
            pendingRequests: [],
            blockedUsers: [],
            isPrivate: false,
            //isVerified: false,
            password: hashedPassword, // Store the hashed password
            //verificationToken: verificationToken 
        });

        /*const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const verificationLink = `http://localhost:8081/verify/${verificationToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Account',
            html: `<p>Please confirm your account by clicking on the link below:</p>
                   <a href="${verificationLink}">Verify Account</a>`,
        });*/

        res.status(201).json({ message: "User was registered successfully" });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.get('/verify/:token', async (req, res) => {
    const { token } = req.params;

    try {
        await client.connect();

        // Find the user with this token
        const user = await db.collection('users').findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // Update user to be verified
        await db.collection('users').updateOne(
            { verificationToken: token },
            { $set: { isVerified: true }, $unset: { verificationToken: "" } }
        );

        res.status(200).json({ message: "Account verified successfully!" });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.post('/addFavoriteAnime/:userId', async (req, res) => {
    const { userId } = req.params; // So I can retrieve the userId somehow. 
    const {email, anime } = req.body;
    const timestamp = new Date();
    const formattedTimestamp = timestamp.toString();

    try {
        await client.connect();
        
        // Find the user by email and add the anime to the favoriteAnimes array
        const result = await db.collection('users').updateOne(
            { email: email },
            { $addToSet: { favoriteAnimes: anime } }
        );

        const userIdStuff = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { username: 1, profilePicture: 1 } }
        );

        await db.collection('activities').insertOne({
            userId: new ObjectId(userId),
            type: 'addFavoriteAnime',
            animeId: anime.id,
            animeTitle: anime.title,
            animeImage: anime.coverImage.medium,
            mainName: userIdStuff.username,
            mainPfp: userIdStuff.profilePicture,
            timestamp: formattedTimestamp
        });

        if (result.matchedCount === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        if (result.modifiedCount === 0) {
            return res.status(400).json({ message: "Anime already in favorites" });
        }

        res.status(200).json({ message: "Anime added to favorites successfully" });
    } catch (error) {
        console.error('Error adding anime to favorites:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.post('/removeAnime', async (req, res) => {
    const { email, anime } = req.body;

    try {
        await client.connect();

        // Find the user by email and add the anime to the favoriteAnimes array
        const result = await db.collection('users').updateOne(
            { email: email },
            { $pull: { favoriteAnimes: anime } }
        );

        if (!result) {
            return res.status(400).json({ message: "Anime not found." });
        }

        res.status(200).json({ message: "Anime removed from the list." });
    } catch (error) {
        console.error('Error removing anime from list:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.post('/follow/:targetUserId', authMiddleware, async (req, res) => {
    const userId = req.user.userId;  // Ensure this matches the token payload structure
    const targetUserId = req.params.targetUserId;
    const timestamp = new Date();
    const formattedTimestamp = timestamp.toString();

    try {
        if (userId.toString() === targetUserId.toString()) {
            return res.status(400).json({
                message: "You cannot follow yourself"
            });
        }

        const targetUser = await db.collection('users').findOne(
            { _id: new ObjectId(targetUserId) },
            { projection: { isPrivate: 1, blockedUsers: 1 } }
        );

        const userIdStuff = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { username: 1, profilePicture: 1 } }
        );

        if (!userIdStuff || !targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (targetUser.blockedUsers && targetUser.blockedUsers.includes(userId)) {
            return res.status(403).json({ message: "You have been blocked by this user." });
        }

        if (targetUser.isPrivate) {
            const existingRequest = await db.collection('activities').findOne({
                userId: new ObjectId(userId),
                targetUserId: new ObjectId(targetUserId),
                type: 'followRequest'
            });

            const pending = await db.collection('users').updateOne(
                { _id: new ObjectId(targetUserId) },
                { $addToSet: { pendingRequests: new ObjectId(userId) } }
            );

            if (existingRequest) {
                return res.status(400).json({ message: "Follow request has already been sent."})
            }

            await db.collection('activities').insertOne({
                userId: new ObjectId(userId),
                type: 'followRequest',
                targetUserId: new ObjectId(targetUserId),
                mainName: userIdStuff.username,
                mainPfp: userIdStuff.profilePicture,
                timestamp: formattedTimestamp
            });
        } else {
            const result1 = await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },  // Ensure proper conversion to ObjectId
                { $addToSet: { following: new ObjectId(targetUserId) } },
            );

            const result2 = await db.collection('users').updateOne(
                { _id: new ObjectId(targetUserId) },
                { $addToSet: { followers: new ObjectId(userId) } }
            );

            await db.collection('activities').insertOne({
                userId: new ObjectId(userId),
                type: 'follow',
                targetUserId: new ObjectId(targetUserId),
                mainName: userIdStuff.username,
                mainPfp: userIdStuff.profilePicture,
                timestamp: formattedTimestamp
            });

            if (result1.modifiedCount === 0 || result2.modifiedCount === 0) {
                return res.status(400).json({ message: "User not found or no changes were made" });
            }
        }

        res.status(200).json({
            message: targetUser.isPrivate ? "Follow request sent successfully" : "User followed successfully"
        });

    } catch (error) {
        console.error("Error following user: ", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

app.post('/block/:targetUserId', authMiddleware, async (req, res) => {
    const userId = req.user.userId;  // Ensure this matches the token payload structure
    const targetUserId = req.params.targetUserId;

    try {
        // Check if the user is trying to block themselves
        if (userId.toString() === targetUserId.toString()) {
            return res.status(400).json({
                message: "You cannot block yourself"
            });
        }

        // Check if the target user exists
        const targetUser = await db.collection('users').findOne(
            { _id: new ObjectId(targetUserId) },
            { projection: { blockedUsers: 1, isPrivate: 1 } }
        );

        if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
        }

        const result1 = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },  // Ensure proper conversion to ObjectId
            { $pull: { following: new ObjectId(targetUserId) } }
        );

        const result2 = await db.collection('users').updateOne(
            { _id: new ObjectId(targetUserId) },
            { $pull: { followers: new ObjectId(userId) } }
        );

        const result3 = await db.collection('users').updateOne(
            { _id: new ObjectId(targetUserId) },
            { $pull: { following: new ObjectId(userId) } }
        );

        const result4 = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { followers: new ObjectId(targetUserId) } }
        );

        const result5 = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { pendingRequests: new ObjectId(targetUserId) } }
        );

        const result6 = await db.collection('users').updateOne(
            { _id: new ObjectId(targetUserId) },
            { $pull: { pendingRequests: new ObjectId(userId) } }
        );

        await db.collection('activities').deleteMany({
            $or: [
                { userId: new ObjectId(userId), targetUserId: new ObjectId(targetUserId), type: 'followRequest' },
                { userId: new ObjectId(targetUserId), targetUserId: new ObjectId(userId), type: 'followRequest' }
            ]
        });

        // Update the current user's blockedUsers array
        const block = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { blockedUsers: new ObjectId(targetUserId) } }
        );

        if (!block.matchedCount) {
            return res.status(404).json({ message: "Current user not found" });
        }

        res.status(200).json({
            message: "User blocked successfully"
        });

    } catch (error) {
        console.error("Error blocking user: ", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

app.post('/unblock/:targetUserId', authMiddleware, async (req, res) => {
    const userId = req.user.userId;  // Ensure this matches the token payload structure
    const targetUserId = req.params.targetUserId;

    try {
        // Check if the user is trying to block themselves
        if (userId.toString() === targetUserId.toString()) {
            return res.status(400).json({
                message: "You cannot unblock yourself"
            });
        }

        // Check if the target user exists
        const targetUser = await db.collection('users').findOne(
            { _id: new ObjectId(targetUserId) },
            { projection: { isPrivate: 1 } }
        );

        if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
        }

        // Update the current user's blockedUsers array
        const block = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { blockedUsers: new ObjectId(targetUserId) } }
        );

        if (!block.matchedCount) {
            return res.status(404).json({ message: "Current user not found" });
        }

        res.status(200).json({
            message: "User unblocked successfully"
        });

    } catch (error) {
        console.error("Error unblocking user: ", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

app.post('/acceptFollowRequest/:requestId', authMiddleware, async (req, res) => {
    const requestId = req.params.requestId;

    try {
        const request = await db.collection('activities').findOne({ _id: new ObjectId(requestId) });

        if (!request || request.type !== 'followRequest') {
            return res.status(404).json({ message: "Follow request not found" });
        }

        const result1 = await db.collection('users').updateOne(
            { _id: new ObjectId(request.userId) },
            { $addToSet: { following: new ObjectId(request.targetUserId) } }
        );

        const result2 = await db.collection('users').updateOne(
            { _id: new ObjectId(request.targetUserId) },
            { $addToSet: { followers: new ObjectId(request.userId) } }
        );

        const removePending = await db.collection('users').updateOne(
            { _id: new ObjectId(request.targetUserId) },
            { $pull: { pendingRequests: new ObjectId(request.userId) } }
        );

        console.log("User ID:", request.userId);
        console.log("Target User ID:", request.targetUserId);

        console.log("Result 1:", result1);
        console.log("Result 2:", result2);

        await db.collection('activities').insertOne({
            userId: new ObjectId(request.userId),
            type: 'follow',
            targetUserId: new ObjectId(request.targetUserId),
            mainName: request.mainName,
            mainPfp: request.mainPfp,
            timestamp: new Date()
        });

        await db.collection('activities').deleteOne({ _id: new ObjectId(requestId) });

        if (result1.modifiedCount === 0 || result2.modifiedCount === 0) {
            return res.status(400).json({ message: "User not found or no changes were made" });
        }

        res.status(200).json({
            message: "Follow request accepted successfully"
        });

    } catch (error) {
        console.error("Error accepting follow request: ", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});


app.post('/rejectFollowRequest/:requestId', authMiddleware, async (req, res) => {
    const requestId = req.params.requestId;

    try {
        const request = await db.collection('activities').findOne({ _id: new ObjectId(requestId) });
        const result = await db.collection('activities').deleteOne({ _id: new ObjectId(requestId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Follow request not found" });
        }

        const removePending = await db.collection('users').updateOne(
            { _id: new ObjectId(request.targetUserId) },
            { $pull: { pendingRequests: new ObjectId(request.userId) } }
        );

        res.status(200).json({
            message: "Follow request rejected successfully"
        });

    } catch (error) {
        console.error("Error rejecting follow request: ", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

app.post('/unfollow/:targetUserId', authMiddleware, async (req, res) => {
    const userId = req.user.userId;  // Ensure this matches the token payload structure
    const targetUserId = req.params.targetUserId;

    try {
        if (userId.toString() === targetUserId.toString()) {
            return res.status(400).json({
                message: "You cannot unfollow yourself"
            });
        }

        const result1 = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },  // Ensure proper conversion to ObjectId
            { $pull: { following: new ObjectId(targetUserId) } }
        );

        const result2 = await db.collection('users').updateOne(
            { _id: new ObjectId(targetUserId) },
            { $pull: { followers: new ObjectId(userId) } }
        );

        if (result1.modifiedCount === 0 || result2.modifiedCount === 0) {
            return res.status(400).json({ message: "User not found or no changes were made" });
        }

        res.status(200).json({
            message: "User unfollowed successfully"
        });

    } catch (error) {
        console.error("Error following user: ", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

app.put('/updateAccount/:userId', authMiddleware, upload.single('profilePic'), async (req, res) => {
    const { userId } = req.params;
    const { username, email, bio, isPrivate } = req.body;
    const profilePicture = req.file ? `http://localhost:8081/images/${req.file.filename}` : undefined;

    try {
        await client.connect();
        const db = client.db(dbName);
        const userObjectId = new ObjectId(userId);

        const updateFields = {};
        const currentUser = await db.collection('users').findOne({ _id: userObjectId });
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (email && email !== currentUser.email) {
            const existingUser = await db.collection('users').findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "Email is already associated with another account" });
            }
            updateFields.email = email;
        }

        if (username) updateFields.username = username;
        if (bio) updateFields.bio = bio;
        if (profilePicture) updateFields.profilePicture = profilePicture;
        if (typeof isPrivate !== 'undefined') updateFields.isPrivate = isPrivate === 'true';

        if (profilePicture) {
            if (currentUser.profilePicture) {
                const oldFilePath = path.join(__dirname, 'images', path.basename(currentUser.profilePicture));
                fs.unlink(oldFilePath, (err) => {
                    if (err) console.error("Error deleting old profile picture: ", err);
                });
            }
            updateFields.profilePicture = profilePicture;
        }

        if (!isPrivate) {
            await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: { pendingRequests: [] } }
            );
            await db.collection('activities').deleteMany({ type: "followRequest" });
        }

        const result = await db.collection('users').updateOne(
            { _id: userObjectId },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const updatedUser = await db.collection('users').findOne({ _id: userObjectId });

        res.status(200).json({
            message: "User updated successfully",
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                bio: updatedUser.bio,
                profilePicture: updatedUser.profilePicture,
                isPrivate: updatedUser.isPrivate
            }
        });
    } catch (error) {
        console.error("Update user error: ", error);
        res.status(500).json({ message: "Error updating user" });
    } finally {
        await client.close();
    }
});

app.delete('/deleteAccount/:userId', authMiddleware, async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();
        const db = client.db(dbName);
        const userObjectId = new ObjectId(userId);

        // Find the user to get the profile picture path
        const user = await db.collection('users').findOne({ _id: userObjectId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete the profile picture file if it exists and is not the default avatar
        if (user.profilePicture && user.profilePicture.startsWith('http://localhost:8081/images/')) {
            const fileName = user.profilePicture.split('/').pop();
            const filePath = path.join(__dirname, 'images', fileName);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Failed to delete profile picture: ", err);
                }
            });
        }

        // Delete the user from the database
        const result = await db.collection('users').deleteOne({ _id: userObjectId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        await db.collection('users').updateMany(
            {
                $or: [
                    { pendingRequests: userObjectId },
                    { followers: userObjectId },
                    { following: userObjectId }
                ]
            },
            {
                $pull: {
                    pendingRequests: userObjectId,
                    followers: userObjectId,
                    following: userObjectId
                }
            }
        );

        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete user error: ", error);
        res.status(500).json({ message: "Error deleting user" });
    } finally {
        await client.close();
    }
});