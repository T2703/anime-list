import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import Navbar from '../Navbar';
import '../../styles/Loader.css';
import '../../styles/Anime.css';

// What's with this page? It's like one of my Japanese animes.

/**
 * This page is where the user can find all of the animes.
 * They can search for some, browse through pages, and view them for more info.
 * They can also filter it as well.
 * @returns Anime page 
 */
function Anime() {
    const [animeList, setAnimeList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [totalItems, setTotalItems] = useState(0);
    const [favoriteAnimes, setFavoriteAnimes] = useState([]);
    const [isFavorite, setIsFavorite] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const token = Cookies.get('token');
    const fetchTimeout = useRef(null);
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Some stuff with local storage and sending the user back if the token no exist.
     */
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const page = params.get('page');
        const storedSearchInput = localStorage.getItem('searchInput');
        const storedPage = localStorage.getItem('page');
        const token = Cookies.get('token');
 
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const userIdFromToken = decodedToken.userId;
                setUserId(userIdFromToken);
                setEmail(localStorage.getItem('email') || '');
                
                if (page) {
                    setCurrentPage(parseInt(page));
                }
                else if (storedPage) {
                    setCurrentPage(parseInt(storedPage));
                }
        
                if (storedSearchInput) {
                    setSearchInput(storedSearchInput);
                    setSearchQuery(storedSearchInput);
                }
        
                if (userIdFromToken) {
                    fetchFavoriteAnimes(userIdFromToken);
                }
            } catch (error) {
                console.error("Error decoding token:", error);
                Cookies.remove('token');
            }
        }
    }, [token, navigate, location]);

    /**
     * How we the fetch the anime from the AniList API. (I like that site)
     */
    const fetchAnime = () => {
        if (fetchTimeout.current) {
            clearTimeout(fetchTimeout.current);
        }

        fetchTimeout.current = setTimeout(() => {
            const query = `
            query ($page: Int, $perPage: Int${searchQuery ? ", $search: String" : ""}) {
                Page (page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                    }
                    media (type: ANIME, sort: POPULARITY_DESC${searchQuery ? ", search: $search" : ""}) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                            medium
                        }
                        averageScore
                        status
                        isAdult
                    }
                }
            }
            `;

            const variables = {
                page: currentPage,
                perPage: 12,
                ...(searchQuery && { search: searchQuery })
            };

            const urlAnime = 'http://localhost:8081/graphql';
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    variables: variables
                })
            };

            setLoading(true);

            fetch(urlAnime, options)
                .then(response => response.json())
                .then(data => {
                    setAnimeList(data.data.Page.media);
                    setTotalItems(data.data.Page.pageInfo.total);
                    setLoading(false);
                })
                .catch(error => {
                    setError(error);
                    setLoading(false);
                });
        }, 300); // Delay the fetch by 300ms otherwise it will freak out badly.
    };

    const fetchFavoriteAnimes = async (userId) => {
        try {
            await delay(360);
            const response = await fetch(`http://localhost:8081/getFavoriteAnimes/${userId}`);
            const data = await response.json();
            console.log(response);
    
            if (response.ok) {
                const favoriteAnimes = data.favoriteAnimes || [];
                setFavoriteAnimes(favoriteAnimes);
            } else {
                alert(data.message || 'Error fetching favorite animes');
            }
        } catch (error) {
            console.error('Error fetching favorite animes:', error);
            alert('An error occurred while fetching favorite animes. Please try again later.');
        }
    };

    const handleFavoriteAnime = async (anime, userId) => {
        if (!token) {
            alert("Please login or register to favortie an anime.");
            return;
        }
        try {
            const response = await fetch(`http://localhost:8081/addFavoriteAnime/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, anime: anime }),
            });
    
            if (response.ok) {
                setFavoriteAnimes([...favoriteAnimes, anime]);
                setIsFavorite(true);
            } else {
                // Error adding anime to favorites
                const errorData = await response.json();
                alert(errorData.message || 'Error adding anime to favorites');
            }
        } catch (error) {
            console.error('Error adding anime to favorites:', error);
            alert('An error occurred while adding anime to favorites. Please try again later.');
        }
    };

    const handleRemoveAnime = async (anime) => {
        if (!token) {
            alert("Please login or register to favortie an anime.");
            return;
        }
        
        try {
            const response = await fetch('http://localhost:8081/removeAnime', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, anime: anime }),
            });
    
            if (response.ok) {
                setFavoriteAnimes(favoriteAnimes.filter(a => a.id !== anime.id));
                setIsFavorite(false);
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Error removing anime');
            }
        } catch (error) {
            console.error('Error removing anime:', error);
            alert('An error occurred while adding anime to favorites. Please try again later.');
        }
    };

    // Keeps it refreshed.
    useEffect(() => {
        fetchAnime();
    }, [currentPage, searchQuery]);

    const handleNextPage = () => {
        setCurrentPage(prevPage => {
            const nextPage = prevPage + 1;
            navigate(`?page=${nextPage}`);
            localStorage.setItem('page', nextPage);
            return nextPage;
        });
    };

    const handlePreviousPage = () => {
        setCurrentPage(prevPage => {
            const prevPageNumber = prevPage > 1 ? prevPage - 1 : 1;
            localStorage.setItem('page', prevPageNumber);
            navigate(`?page=${prevPageNumber}`);
            return prevPageNumber;
        });
    };

    const handleSearchChange = (e) => {
        setSearchInput(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        setSearchQuery(searchInput);
        localStorage.setItem('searchInput', searchInput);
        navigate(`?page=1`);
    };

    const totalPages = Math.ceil(totalItems / 12);

    if (loading) {
        return <div><Navbar /> <div className="loader"></div></div>;
    }

    if (error) {
        return <div><Navbar /> Error: {error.message}</div>;
    }

    return (
        <div>
            <Navbar />
            <div className="input-group mb-3" style={{ maxWidth: '300px', margin: '20px auto' }}>
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
            </div>
            <div className="container">
                <div className="row">
                    {animeList.length > 0 ? (
                        animeList.map(anime => (
                            <div className="col-md-4 mb-4" key={anime.id}>
                                <div className="card h-100 d-flex flex-column">
                                    <h3 className="card-title">{anime.title.english || anime.title.romaji}</h3>
                                    <img src={anime.coverImage.large} className="card-img-top" alt={anime.title.romaji} />
                                    <div className="card-body text-center">
                                        <button className="btn btn-primary" onClick={() => navigate(`/animeinfo/${anime.id}?page=${currentPage}`)}>View</button>
                                        <br></br>
                                        {favoriteAnimes.some(favAnime => favAnime.id === anime.id) ? (
                                            <button 
                                                className="btn btn-danger mt-2"
                                                onClick={() => handleRemoveAnime(anime)}
                                            >
                                                Unfavorite
                                            </button>
                                        ) : (
                                            <button 
                                                className="btn btn-success mt-2" 
                                                onClick={() => handleFavoriteAnime(anime, userId)}
                                            >
                                                Favorite
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No anime found.</p>
                    )}
                </div>
                <div className="d-flex justify-content-between">
                    <button 
                        type="button" 
                        className="btn btn-success" 
                        onClick={handlePreviousPage} 
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-success" 
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Anime;
