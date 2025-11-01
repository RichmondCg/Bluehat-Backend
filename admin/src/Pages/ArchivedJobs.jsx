import { useEffect, useState } from "react";
import { getArchivedJobs, restoreJob } from "../Api/archived";
import { getAllSkills } from "../Api/skillApi";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Archive,
} from "lucide-react";

const ArchivedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [jobToRestore, setJobToRestore] = useState(null);

  // Pagination & Filtering state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "",
    location: "",
    category: "",
    sortBy: "createdAt",
    order: "desc",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Temporary input states (not triggering API calls)
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  // Categories state
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // ✅ Fetch categories
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await getAllSkills();
      if (res.data.success) {
        setCategories(res.data.data.categories.filter((cat) => !cat.isDeleted));
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ Fetch all archived jobs with filters
  const fetchArchivedJobs = async () => {
    try {
      setJobLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        order: filters.order,
      };

      // Add optional filters
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.location) params.location = filters.location;
      if (filters.category) params.category = filters.category;

      const res = await getArchivedJobs(params);
      if (res.data.success) {
        setJobs(res.data.data.jobs);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error(err);
      setJobError("Error fetching archived jobs");
    } finally {
      setJobLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleRestore = async () => {
    if (!jobToRestore) return;

    try {
      setRestoreLoading(jobToRestore.id);
      await restoreJob(jobToRestore.id);

      // ✅ Just refetch everything
      setShowRestoreModal(false);
      setJobToRestore(null);
      setRestoreLoading(null);

      // ✅ Refresh the list
      await fetchArchivedJobs();

      console.log("✅ Job restored and list refreshed!");
    } catch (err) {
      console.error("❌ Restore error:", err);
      alert(
        "Failed to restore job: " + (err.response?.data?.message || err.message)
      );
      setRestoreLoading(null);
      setShowRestoreModal(false);
      setJobToRestore(null);
    }
  };
  const openRestoreModal = (job) => {
    setJobToRestore(job);
    setShowRestoreModal(true);
  };

  // Handle Enter key press for search and location
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      setFilters({ ...filters, search: searchInput, page: 1 });
    }
  };

  const handleLocationKeyPress = (e) => {
    if (e.key === "Enter") {
      setFilters({ ...filters, location: locationInput, page: 1 });
    }
  };

  return (
    <>
      <div className="p-4 sm:ml-64">
        {/* === Archived Job Posts Section === */}
        <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Archive className="text-gray-600" size={28} />
              <h1 className="text-3xl font-bold text-gray-800">
                Archived Job Posts
              </h1>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-[#55b3f3] text-white rounded-xl hover:bg-sky-700 transition duration-200 cursor-pointer"
            >
              <Filter size={20} />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {/* Filter Section */}
          {showFilters && (
            <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search (Press Enter)
                  </label>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search jobs... (Press Enter)"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        category: e.target.value,
                        page: 1,
                      })
                    }
                    disabled={categoriesLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        status: e.target.value,
                        page: 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="hired">Hired</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location (Press Enter)
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by location... (Press Enter)"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyPress={handleLocationKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={`${filters.sortBy}-${filters.order}`}
                    onChange={(e) => {
                      const [sortBy, order] = e.target.value.split("-");
                      setFilters({ ...filters, sortBy, order, page: 1 });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="price-asc">Price: Low to High</option>
                  </select>
                </div>
              </div>

              {/* Items per page */}
              <div className="mt-4 flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Items per page:
                </label>
                <select
                  value={filters.limit}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      limit: parseInt(e.target.value),
                      page: 1,
                    })
                  }
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>

                <button
                  onClick={() => {
                    setFilters({
                      page: 1,
                      limit: 10,
                      search: "",
                      status: "",
                      location: "",
                      category: "",
                      sortBy: "createdAt",
                      order: "desc",
                    });
                    setSearchInput("");
                    setLocationInput("");
                  }}
                  className="ml-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          {!jobLoading && !jobError && (
            <div className="mb-4 text-sm text-gray-600">
              Showing {jobs.length} of {pagination.totalItems} archived jobs
            </div>
          )}

          {jobLoading ? (
            <p className="text-gray-500">Loading archived jobs...</p>
          ) : jobError ? (
            <p className="text-red-500">{jobError}</p>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="mx-auto text-gray-300 mb-4" size={64} />
              <p className="text-gray-600 text-lg">No archived jobs found.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition duration-200 relative"
                >
                  {/* Restore Button - Top Right */}
                  <button
                    onClick={() => openRestoreModal(job)}
                    disabled={restoreLoading === job.id}
                    className="absolute top-4 right-4 p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 cursor-pointer"
                    title="Restore job post"
                  >
                    {restoreLoading === job.id ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <RotateCcw size={20} />
                    )}
                  </button>

                  {/* Job Content */}
                  <div className="pr-12">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      {job.category?.name || "Unknown Category"}
                    </h2>
                    <p className="text-gray-600 mb-2">{job.description}</p>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-500 mt-3">
                      <span className="px-3 py-1 bg-[#55b3f3] text-[#f4f6f6] rounded-full">
                        ₱{job.price?.toLocaleString() || "N/A"}
                      </span>
                      <span className="px-3 py-1 border rounded-full">
                        {job.location}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full ${
                          job.status === "open"
                            ? "bg-yellow-100 text-yellow-700"
                            : job.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : job.status === "in_progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
                        Archived
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-3">
                      Posted by: {job.client?.name || "Unknown"}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination Controls */}
          {!jobLoading && !jobError && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page - 1 })
                  }
                  disabled={!pagination.hasPrevPage}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex gap-2">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (
                        pagination.currentPage >=
                        pagination.totalPages - 2
                      ) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() =>
                            setFilters({ ...filters, page: pageNum })
                          }
                          className={`px-3 py-2 rounded-lg transition duration-200 ${
                            pagination.currentPage === pageNum
                              ? "bg-[#55b3f3] text-white"
                              : "bg-white border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page + 1 })
                  }
                  disabled={!pagination.hasNextPage}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && jobToRestore && (
        <div className="fixed inset-0 bg-[#f4f6f6] bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Confirm Restore
              </h2>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setJobToRestore(null);
                }}
                className="text-gray-500 font-bold text-2xl hover:text-gray-700 cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to restore this job post? It will be visible
              to users again.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-700">
                <strong>Category:</strong>{" "}
                {jobToRestore.category?.name || "Unknown"}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Location:</strong> {jobToRestore.location}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Price:</strong> ₱
                {jobToRestore.price?.toLocaleString() || "N/A"}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setJobToRestore(null);
                }}
                disabled={restoreLoading}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-400 transition duration-200 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={restoreLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {restoreLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw size={18} />
                    Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ArchivedJobs;
