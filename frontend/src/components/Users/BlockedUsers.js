import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import Navbar from '../Navbar';
import { jwtDecode } from "jwt-decode";

function BlockedUsers() {
  const [users, setUsers] = useState([]);
  const { userId } = useParams();
  const [loggedInUser, setLoggedInUser] = useState(null);
  const navigate = useNavigate();
  const token = Cookies.get('token');
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const fetchBlock = async (userId) => {
    try {
        const response = await fetch(`http://localhost:8081/getBlocked/${userId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        const blockedUsers = data.blockedUsers || []
        setUsers(blockedUsers);
        console.log(users)
        
  
        //console.log(followedUsers)
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

const handleUnBlock = async (targetUserId) => {
  const userToFollow = users.find(user => user._id === targetUserId);

  try {
      const response = await fetch(`http://localhost:8081/unblock/${targetUserId}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          }
      });

      if (response.ok) {
          console.log('User unblocked successfully');
      } else {
          const errorData = await response.json();
          console.error('Block user error:', errorData.message || 'Block to follow user');
      }
  } catch (error) {
      console.error('Error block user:', error);
  }
};

useEffect(() => {
    if (!token) {
        navigate('/login'); 
    } else {
        const decodedToken = jwtDecode(token);
        setLoggedInUser(decodedToken.userId);
        console.log(loggedInUser);
        fetchBlock(userId);
    }
}, [token, userId, navigate, users]);

const handleSearchChange = (e) => {
    //const inputValue = e.target.value.toLowerCase();
    setSearchInput(e.target.value.toLowerCase());
    //setCurrentPage(1);
}

const filteredUsers = users.filter((user) => {
    return user.username.toLowerCase().includes(searchQuery.toLowerCase());
});

const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
};

const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
};

const handleNextPage = () => {
    handlePageChange(currentPage + 1);
};

const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchQuery(searchInput);
};


const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

return (
  <div className="App">
    <Navbar />
    <div>
      <form onSubmit={handleSearchSubmit} className="searchBar my-2 d-flex justify-content-center">
        <div className="input-group" style={{ maxWidth: '300px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search for users"
            onChange={handleSearchChange}
            value={searchInput}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>
      <div className="row m-0">
        {currentItems.length > 0 ? (
          currentItems.map(user => (
            <div key={user._id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
              <div className="card recipe-card" style={{ maxWidth: "360px" }}>
                <h5 className="card-title text-center">{user.username}</h5>
                <div className="profile-picture-container d-flex justify-content-center align-items-center">
                  <img
                    src={user.profilePicture}
                    className="card-img-top img-fluid rounded-circle"
                    alt={user.username}
                    style={{ height: "200px", width: "200px", objectFit: "cover" }}
                  />
                </div>
                <button
                    className="btn btn-primary mx-1"
                    onClick={() => handleUnBlock(user._id)}
                >
                    unblock
                </button>
                <div className="card-body text-center"></div>
              </div>
            </div>
          ))
        ) : (
          <p>No blocked users found.</p>
        )}
      </div>
      <div className="pagination d-flex justify-content-center mt-3">
        <button
          className="btn btn-primary mx-1"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <button
          className="btn btn-primary mx-1"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  </div>
);
}

export default BlockedUsers;