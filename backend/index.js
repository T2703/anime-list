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
    await client.connect();
    console.log("Node connected successfully to GET MongoDB");

    const query = {};
    const results = await db

    // Rework this with page nums
    .collection("users")
    .find(query)
    .limit(100)
    .toArray();

    console.log(results);
    res.status(200);
    res.send(results);
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

        // Fetching activities where the user is either following someone or is the target of a follow
        const activities = await db.collection('activities')
        .find({
            $or: [
                // Fetch follow and follow request activities for the logged-in user
                { targetUserId: userObjectId, type: { $in: ['follow', 'followRequest'] } },
                
                // Fetch 'addFavoriteAnime' activities from users that the logged-in user follows
                { userId: { $in: followingIDs.map(id => new ObjectId(id)) }, type: 'addFavoriteAnime' }
            ]
        })
        .sort({ timestamp: -1 }) // Sorting by most recent activities
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
            password: hashedPassword // Store the hashed password
        });

        res.status(201).json({ message: "User was registered successfully" });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: "A server error occurred" });
    }
});

app.post('/addFavoriteAnime/:userId', async (req, res) => {
    const { userId } = req.params; // So I can retrieve the userId somehow. 
    const {email, anime } = req.body;

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
            timestamp: new Date()
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

    try {
        if (userId.toString() === targetUserId.toString()) {
            return res.status(400).json({
                message: "You cannot follow yourself"
            });
        }

        const targetUser = await db.collection('users').findOne(
            { _id: new ObjectId(targetUserId) },
            { projection: { isPrivate: 1 } }
        );

        const userIdStuff = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { username: 1, profilePicture: 1 } }
        );

        if (!userIdStuff || !targetUser) {
            return res.status(404).json({ message: "User not found" });
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
                timestamp: new Date()
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
                timestamp: new Date()
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
            { projection: { isPrivate: 1 } }
        );

        if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
        }

        // Update the current user's blockedUsers array
        const block = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { blockedUsers: new ObjectId(targetUserId) } }
        );

        const blockUserOnRecevingEnd = await db.collection('users').updateOne(
            { _id: new ObjectId(targetUserId) },
            { $addToSet: { blockedUsers: new ObjectId(userId) } }
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

        const blockUserOnRecevingEnd = await db.collection('users').updateOne(
            { _id: new ObjectId(targetUserId) },
            { $pull: { blockedUsers: new ObjectId(userId) } }
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
        const existingUser = await db.collection('users').findOne({ email });
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        if (username) updateFields.username = username;
        if (email) updateFields.email = email;
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
            const removeAllPending = await db.collection('users').updateOne(
                { _id: new ObjectId(request.userId) },
                { $set: { pendingRequests: [] } } 
            );

            const removeAllActivites = await db.collection('activities').deleteMany({ type: "followRequest" });
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

        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete user error: ", error);
        res.status(500).json({ message: "Error deleting user" });
    } finally {
        await client.close();
    }
});