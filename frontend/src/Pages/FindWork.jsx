import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Briefcase,
  Clock,
  Search,
  X,
  CheckCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { checkAuth } from "../api/auth";
import { getAllJobs, postJob as createJob } from "../api/jobs";
import axios from "axios";
import AddressInput from "../components/AddressInput";
import PortfolioSetup from "../components/PortfolioSetup";
import IDSetup from "../components/IDSetup";
import VerificationNotice from "../components/VerificationNotice";

const currentUser = {
  avatar:
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
};

const FindWork = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [location, setLocation] = useState("");
  const [locationInput, setLocationInput] = useState(""); 
  const [jobPosts, setJobPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  // Dynamic inner scroll height for job list
  const listRef = useRef(null);
  const [listHeight, setListHeight] = useState(480);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPortfolioSetup, setShowPortfolioSetup] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const desktopFilterContainerRef = useRef(null);

  // Note: removed ratings prefetch to reduce API calls

  const [newJob, setNewJob] = useState({
    description: "",
    location: "",
    priceOffer: "",
  });

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  // New: filter category for searching jobs
  const [filterCategory, setFilterCategory] = useState("");

  // Sorting states
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  // NEW: Draft and confirm modal state
  const [draft, setDraft] = useState(null);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);

  const [showIdSetup, setShowIdSetup] = useState(false);

  // NEW: Reset form helper
  const resetForm = () => {
    setNewJob({ description: "", location: "", priceOffer: "" });
    setSelectedCategory("");
  };

  // NEW: Handle modal close with draft check
  const handleCloseModal = () => {
    const hasInput =
      newJob.description ||
      newJob.location ||
      newJob.priceOffer ||
      selectedCategory;

    if (hasInput) {
      setShowDraftConfirm(true);
    } else {
      resetForm();
      setIsModalOpen(false);
    }
  };

  // NEW: Save/Discard draft
  const handleSaveDraft = () => {
    setDraft({ ...newJob, category: selectedCategory });
    setShowDraftConfirm(false);
    setIsModalOpen(false);
  };

  const handleDiscardDraft = () => {
    resetForm();
    setDraft(null);
    setShowDraftConfirm(false);
    setIsModalOpen(false);
  };

  // NEW: Load draft when modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (draft) {
        setNewJob({
          description: draft.description,
          location: draft.location,
          priceOffer: draft.priceOffer,
        });
        setSelectedCategory(draft.category);
      } else {
        resetForm();
      }
    }
  }, [isModalOpen]);

  // ================== YOUR EXISTING LOGIC ==================

  // Fetch jobs with pagination and minimal calls
  const fetchJobs = async ({ useCache = true, pageOverride = null } = {}) => {
    try {
      const effectivePage = pageOverride ?? page;
      const isFirstPage = effectivePage === 1;

      if (isFirstPage) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      const options = { page: effectivePage, limit };
      if (filterCategory) options.category = filterCategory;
      if (location) options.location = location;
      if (sortBy) options.sortBy = sortBy;
      if (order) options.order = order;
      if (!useCache) options._t = Date.now();
      const response = await getAllJobs(options);
      const jobsArray = Array.isArray(response.data?.data?.jobs)
        ? response.data.data.jobs
        : [];
      setHasMore(jobsArray.length === limit);

      if (isFirstPage) {
        setJobPosts(jobsArray);
      } else {
        setJobPosts((prev) => {
          const seen = new Set(prev.map((j) => String(j.id || j._id || "")));
          const toAdd = jobsArray.filter(
            (j) => !seen.has(String(j.id || j._id || ""))
          );
          return [...prev, ...toAdd];
        });
      }
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchJobs({ useCache: false, pageOverride: 1 });
    } finally {
      setIsRefreshing(false);
    }
  };

  const mode = import.meta.env.VITE_APP_MODE;

  const baseURL =
    mode === "production"
      ? import.meta.env.VITE_API_PROD_URL
      : import.meta.env.VITE_API_DEV_URL;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${baseURL}/skills`);
        const cats = res.data?.data?.categories;
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Initial fetch (page 1 only)
  // Removed duplicate initial fetch to avoid double API calls on mount.

  // Handle Enter key press for search and location (use onKeyDown; onKeyPress is deprecated)
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      setSearch(searchInput.trim());
    }
  };

  const handleLocationKeyPress = (e) => {
    if (e.key === "Enter") {
      setLocation(locationInput.trim());
    }
  };

  // Refetch when filters or sorting changes (reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchJobs({ useCache: false, pageOverride: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, location, sortBy, order]);

  // Load more when page increases (>1)
  useEffect(() => {
    if (page > 1) {
      fetchJobs({ useCache: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Compute dynamic height so only the job list scrolls
  useEffect(() => {
    const computeListHeight = () => {
      if (!listRef.current) return;
      const rect = listRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      // 12-16px bottom padding safety
      const h = Math.max(viewportH - rect.top - 16, 200);
      setListHeight(h);
    };
    const rafCompute = () => requestAnimationFrame(computeListHeight);
    // Initial and after layout changes
    rafCompute();
    window.addEventListener("resize", computeListHeight);
    return () => window.removeEventListener("resize", computeListHeight);
  }, [loading, showMobileFilters, showDesktopFilters, user, page, filterCategory, location, sortBy, order]);

  // Handle posting a new job
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!newJob.description || !newJob.location || !newJob.priceOffer) {
      alert("Please fill out all required fields");
      return;
    }
    if (!selectedCategory) {
      alert("Please select a category");
      return;
    }
    try {
      const jobData = {
        description: newJob.description,
        location: newJob.location,
        price: parseFloat(newJob.priceOffer),
        category: selectedCategory,
      };

      await createJob(jobData);

      // Refresh job list to include the new job
  setPage(1);
  await fetchJobs({ useCache: false, pageOverride: 1 });

      resetForm();
      setIsModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error posting job:", error);
      alert(error.response?.data?.message || "Failed to post job");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
  const res = await checkAuth();
  const userData = res.data?.data;

        setUser(userData);

        if (userData?.userType === "worker") {
          const biography =
            typeof userData.biography === "string"
              ? userData.biography.trim()
              : "";
          const portfolios = Array.isArray(userData.portfolio)
            ? userData.portfolio
            : [];
          const certificates = Array.isArray(userData.certificates)
            ? userData.certificates
            : [];
          const skills = Array.isArray(userData.skillsByCategory)
            ? userData.skillsByCategory
            : [];
          const experiences = Array.isArray(userData.experience)
            ? userData.experience
            : [];
          const education = Array.isArray(userData.education)
            ? userData.education
            : [];

          const shouldShowModal =
            portfolios.length === 0 ||
            certificates.length === 0 ||
            skills.length === 0 ||
            experiences.length === 0 ||
            biography.length === 0 ||
            education.length === 0;

          setShowPortfolioSetup(shouldShowModal);

          if (!userData.idPictureId && !userData.selfiePictureId) {
            setShowIdSetup(true);
          }
        } else {
          setShowPortfolioSetup(false);
        }
      } catch (err) {
        console.error("Auth check failed", err);
        setShowPortfolioSetup(false);
      }
    };

    fetchUser();
  }, []);

  // Close desktop filters dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!showDesktopFilters) return;

    const handleOutside = (e) => {
      const el = desktopFilterContainerRef.current;
      if (el && !el.contains(e.target)) {
        setShowDesktopFilters(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") setShowDesktopFilters(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showDesktopFilters]);

  // Filter jobs (client-side search across description, location, and category label)
  const filteredJobs = Array.isArray(jobPosts)
    ? jobPosts.filter((job) => {
        const q = (search || "").trim().toLowerCase();
        if (!q) return true;
        const desc = (job.description || "").toLowerCase();
        const loc = (job.location || "").toLowerCase();
        const cat = (
          job.category?.name || job.category?.categoryName || ""
        ).toLowerCase();
        return (
          desc.includes(q) ||
          loc.includes(q) ||
          cat.includes(q)
        );
      })
    : [];

  if (loading && (page === 1 || jobPosts.length === 0)) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-0 mt-25 md:mt-35">
        <div className="space-y-4 pb-4 animate-pulse">
          {/* Search Bar Skeleton */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-1/2 h-10 bg-gray-200 rounded-[18px]" />
            <div className="w-full md:w-1/4 h-10 bg-gray-200 rounded-md" />
          </div>

          {/* Post Box Skeleton */}
          {user?.userType === "client" && (
            <div className="bg-white shadow rounded-[20px] p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 bg-gray-100 h-10 rounded-full" />
              </div>
            </div>
          )}

          {/* Job Cards Skeleton (repeat 3 times) */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="flex gap-2 mt-3">
                <div className="h-6 bg-gray-200 rounded-full w-24" />
                <div className="h-6 bg-gray-200 rounded-full w-20" />
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-0 mt-25 md:mt-35">

      <VerificationNotice user={user} />

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div ref={desktopFilterContainerRef} className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
          <input
            type="text"
            placeholder="Search job descriptions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full px-4 py-4 md:py-3 shadow rounded-[18px] bg-white pl-10 pr-44 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="button"
            onClick={() => setSearch(searchInput.trim())}
            className="absolute right-24 md:right-26 top-1/2 -translate-y-1/2 px-3 py-2 rounded-[14px] bg-sky-500 text-white text-sm hover:bg-sky-700 shadow-md cursor-pointer"
            aria-label="Search"
          >
            Search
          </button>

          {/* Mobile filters trigger next to Search (inline) */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(true)}
            className="flex md:hidden absolute right-2 top-1/2 -translate-y-1/2 px-2 md:px-3 py-2 rounded-[14px] bg-white border border-gray-200 text-gray-700 text-sm shadow-sm hover:bg-gray-50 cursor-pointer items-center gap-2"
            aria-label="Filters"
            aria-expanded={showMobileFilters}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          {/* Desktop filters trigger inside search row */}
          <button
            type="button"
            onClick={() => setShowDesktopFilters((s) => !s)}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-[14px] bg-white border border-gray-200 text-gray-700 text-sm shadow-sm hover:bg-gray-50 cursor-pointer items-center gap-2"
            aria-label="Filters"
            aria-expanded={showDesktopFilters}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          {/* Desktop filters dropdown popover */}
          {showDesktopFilters && (
            <div className="hidden md:block absolute right-0 top-full mt-2 w-80 bg-white shadow-lg rounded-lg p-3 z-20">
              {/* Location */}
              <div className="flex items-stretch gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Filter by location"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={handleLocationKeyPress}
                  className="flex-1 px-3 py-2 shadow rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  type="button"
                  onClick={() => setLocation(locationInput.trim())}
                  className="shrink-0 px-3 py-2 rounded-md bg-[#55b3f3] text-white text-sm hover:bg-blue-400 cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {/* Category */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
              {/* Sorting */}
              <div className="flex gap-3 flex-wrap mb-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 shadow rounded-md bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1"
                >
                  <option value="createdAt">Date Posted</option>
                  <option value="price">Price</option>
                  <option value="updatedAt">Last Updated</option>
                </select>
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="px-3 py-2 shadow rounded-md bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
              {(filterCategory || location || sortBy !== "createdAt" || order !== "desc") && (
                <button
                  onClick={() => {
                    setFilterCategory("");
                    setLocation("");
                    setSearch("");
                    setSortBy("createdAt");
                    setOrder("desc");
                  }}
                  className="text-sm text-[#55b3f3] hover:text-sky-700 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile: inline filter button moved next to Search above */}

        {/* Desktop: toggle handled inside search bar; no inline button here */}
      </div>

      {/* Mobile filters modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileFilters(false)}
            aria-hidden="true"
          />
          {/* Bottom sheet panel */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Filters</h3>
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Location */}
            <div className="flex items-stretch gap-2 mb-3">
              <input
                type="text"
                placeholder="Filter by location"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleLocationKeyPress}
                className="flex-1 px-3 py-2 shadow rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="button"
                onClick={() => setLocation(locationInput.trim())}
                className="shrink-0 px-3 py-2 rounded-md bg-[#55b3f3] text-white text-sm hover:bg-blue-400 cursor-pointer"
              >
                Apply
              </button>
            </div>
            {/* Category */}
            <div className="mb-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>
            {/* Sorting */}
            <div className="flex gap-3 flex-wrap mb-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 shadow rounded-md bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1"
              >
                <option value="createdAt">Date Posted</option>
                <option value="price">Price</option>
                <option value="updatedAt">Last Updated</option>
              </select>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="px-3 py-2 shadow rounded-md bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            {(filterCategory || location || sortBy !== "createdAt" || order !== "desc") && (
              <button
                onClick={() => {
                  setFilterCategory("");
                  setLocation("");
                  setSearch("");
                  setSortBy("createdAt");
                  setOrder("desc");
                }}
                className="text-sm text-[#55b3f3] hover:text-sky-700 hover:underline"
              >
                Clear all filters
              </button>
            )}
            {/* <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="px-4 py-2 bg-[#55b3f3] text-white rounded-md hover:bg-blue-400"
              >
                Done
              </button>
            </div> */}
          </div>
        </div>
      )}

      {/* Post Box */}
      {user?.userType === "client" && (
        <div
          onClick={() => setIsModalOpen(true)}
          className="bg-white shadow rounded-[20px] p-4 mb-6 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <img
              src={user?.image || currentUser.avatar}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover"
            />

            <div className="flex-1 bg-gray-100 px-4 py-2 rounded-full text-gray-500 text-left">
              Post a work...
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 shadow-lg relative">
            {/* CHANGED: Close uses draft check */}
            <button
              onClick={handleCloseModal}
              className="absolute top-1 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Job Preview (skeleton when empty, live preview when filled) */}
            <div className="mt-6 pt-4">
              <div className="rounded-[20px] p-4 bg-gray-50 shadow-sm mb-4">
                {newJob.description || newJob.location || selectedCategory || newJob.priceOffer ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={user?.image || currentUser.avatar}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium text-[#252525] opacity-75">
                          {user?.fullName || "Client Name"}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                        {/* <Clock size={16} /> Just now */}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5">
                        <Briefcase size={20} className="text-blue-400" />
                      </span>
                      <span className="line-clamp-1 md:text-base">
                        {newJob.description || "Job description will appear here..."}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedCategory ? (
                        <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-sm">
                          {categories.find((c) => c._id === selectedCategory)?.categoryName}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No category selected</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-600 ">
                      <span className="flex items-center gap-1">
                        <MapPin size={16} />
                        <span className="truncate overflow-hidden max-w-45 md:max-w-full md:text-base text-gray-500">
                          {newJob.location || "Location"}
                        </span>
                      </span>
                      <span className="font-bold text-green-400">
                        {newJob.priceOffer ? `₱${parseFloat(newJob.priceOffer).toLocaleString()}` : "₱0"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="animate-pulse">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200" />
                        <div className="h-4 bg-gray-200 rounded w-24" />
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </div>
                    <div className="mt-2 h-5 bg-gray-200 rounded w-3/4" />
                    <div className="flex gap-2 mt-3">
                      <div className="h-6 bg-gray-200 rounded-full w-24" />
                      <div className="h-6 bg-gray-200 rounded-full w-20" />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-1/6" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Job Creation Form */}
            <form onSubmit={handlePostJob} className="space-y-3">
              <textarea
                placeholder="Job description"
                value={newJob.description}
                onChange={(e) =>
                  setNewJob({ ...newJob, description: e.target.value })
                }
                className="px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full"
                rows="3"
              />
              <label className="block text-sm font-medium text-gray-500 mb-1 text-left">
                Address
              </label>
              <AddressInput
                value={newJob.location}
                onChange={(address) =>
                  setNewJob({ ...newJob, location: address })
                }
              />
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1 text-left">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 text-gray-500 text-sm rounded-lg block w-full"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                placeholder="Price offer (₱)"
                value={newJob.priceOffer}
                onChange={(e) =>
                  setNewJob({ ...newJob, priceOffer: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block"
                min="0"
                step="0.01"
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-[#55b3f3] text-white rounded-md hover:bg-blue-400 cursor-pointer transition-colors"
              >
                Post Job
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Draft confirmation modal */}
      {showDraftConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-40 z-50">
          <div className="bg-white rounded-[20px] p-6 shadow-lg max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold mb-4">Save draft</h3>
            <p className="text-gray-600 mb-6">
              You have unsaved input. Do you want to save it as a draft or
              discard it?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleDiscardDraft}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-[#55b3f3] text-white rounded-md hover:bg-sky-600 cursor-pointer transition-colors"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Setup Modal */}
      {showIdSetup && <IDSetup onClose={() => setShowIdSetup(false)} />}

      {/* Show Portfolio Setup */}
      {showPortfolioSetup && (
        <PortfolioSetup onClose={() => setShowPortfolioSetup(false)} />
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 bg-[#55b3f3] text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle size={20} /> Job posted successfully!
        </div>
      )}

      {/* Job Posts Display (inner scroll like FindWorker) */}
      {filteredJobs.length > 0 ? (
        <div ref={listRef} style={{ height: listHeight }} className="custom-scrollbar flex flex-col overflow-y-auto pr-2">
          <div className="space-y-4 pb-4">
            {filteredJobs.map((job) => {
            const toIdString = (val) => {
              if (!val) return "";
              if (typeof val === "string") return val;
              if (typeof val === "object") return val._id || val.id || "";
              try { return String(val); } catch { return ""; }
            };
            // Robustly derive the Client model id for profile route
            const clientProfileId =
              toIdString(job?.client?.id) ||
              toIdString(job?.client?._id) ||
              toIdString(job?.clientId);
            return (
              <div
                key={job.id || job._id}
                className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block cursor-pointer"
                onClick={() => {
                  const viewerIsClient = user?.userType === "client";

                  const idToStr = (val) => {
                    if (!val) return "";
                    if (typeof val === "string") return val;
                    if (typeof val === "object") return val._id || val.id || String(val || "");
                    try {
                      return String(val);
                    } catch {
                      return "";
                    }
                  };

                  const viewerCandidates = [
                    user?.profileId, 
                    user?.credentialId?._id, 
                    user?.credentialId, 
                    user?._id, 
                    user?.id, 
                  ]
                    .map(idToStr)
                    .filter((s) => typeof s === "string" && s.length);

                  const ownerCandidates = [
                    job?.client?.credentialId?._id,
                    job?.client?.credentialId,
                    job?.client?.id,
                    job?.client?._id,
                    job?.credentialId,
                  ]
                    .map(idToStr)
                    .filter((s) => typeof s === "string" && s.length);

                  const anyMatch = viewerCandidates.some((v) =>
                    ownerCandidates.includes(v)
                  );

                  const isOwner = Boolean(viewerIsClient && anyMatch);

                  if (isOwner) {
                    navigate(`/invite-workers/${job.id || job._id}`);
                  } else {
                    navigate(`/job/${job.id || job._id}`);
                  }
                }}
              >
                <div className="rounded-xl p-4 bg-white transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (clientProfileId) navigate(`/client/${clientProfileId}`);
                        }}
                        className="focus:outline-none"
                        title="View client profile"
                      >
                        <img
                          src={
                            job.client?.profilePicture?.url ||
                            currentUser.avatar
                          }
                          alt="Client Avatar"
                          className="w-8 h-8 rounded-full object-cover cursor-pointer"
                        />
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#252525] opacity-75">
                          {job.client?.name || "Client Name"}
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                      {new Date(job.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5">
                      <Briefcase size={20} className="text-blue-400" />
                    </span>
                    <span className="line-clamp-1 md:text-base">
                      {job.description}
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-sm">
                      {job.category?.name || "Uncategorized"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-4 text-sm text-gray-600 ">
                    <span className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span className="truncate overflow-hidden max-w-45 md:max-w-full md:text-base text-gray-500">
                        {job.location}
                      </span>
                    </span>
                    <span className="font-bold text-green-400">
                      ₱{job.price?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
            {hasMore && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetchingMore}
                className="px-4 py-2 bg-white shadow rounded-md hover:shadow-md disabled:opacity-60"
              >
                {isFetchingMore ? "Loading…" : "Load more"}
              </button>
            </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center mt-10">
          <p className="text-gray-500 mb-4">No job posts found.</p>
          {search ||
          location ||
          filterCategory ||
          sortBy !== "createdAt" ||
          order !== "desc" ? (
            <p className="text-sm text-gray-400">
              Try adjusting your search filters or{" "}
              <button
                onClick={() => {
                  setSearch("");
                  setLocation("");
                  setFilterCategory("");
                  setSortBy("createdAt");
                  setOrder("desc");
                }}
                className="text-blue-500 hover:underline"
              >
                clear all filters
              </button>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default FindWork;
