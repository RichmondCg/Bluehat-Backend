import React, { useEffect, useState } from "react";
import {
  Users,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
  AlertTriangle,
  X,
  Loader,
} from "lucide-react";
import {
  getClients,
  blockClient,
  unblockClient,
} from "../Api/clientmanagement";

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingClient, setBlockingClient] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination and filtering states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statistics, setStatistics] = useState({
    total: 0,
    blocked: 0,
    active: 0,
  });

  useEffect(() => {
    fetchClients();
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  const fetchClients = async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        search: searchTerm.trim() || undefined,
        status: statusFilter,
        sortBy,
        order: sortOrder,
      };

      const response = await getClients(params);

      if (response.success) {
        setClients(response.data.clients || []);

        // Update pagination info
        const pagination = response.data.pagination || {};
        setTotalPages(pagination.totalPages || 1);
        setTotalItems(pagination.totalItems || 0);

        // Update statistics
        setStatistics(
          response.data.statistics || {
            total: 0,
            blocked: 0,
            active: 0,
          }
        );
      } else {
        console.error("API returned error:", response.message);
        setClients([]);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const viewClientDetails = (client) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedClient(null);
    setShowModal(false);
  };

  const openBlockModal = (client) => {
    setBlockingClient(client);
    setBlockReason("");
    setShowBlockModal(true);
  };

  const closeBlockModal = () => {
    setBlockingClient(null);
    setBlockReason("");
    setShowBlockModal(false);
  };

  const handleBlockClient = async () => {
    if (!blockReason.trim()) {
      alert("Please provide a reason for blocking this client.");
      return;
    }

    try {
      setActionLoading(true);

      const response = await blockClient(blockingClient.credentialId, {
        reason: blockReason.trim(),
      });

      if (response.success) {
        // Refresh the clients list
        await fetchClients();
        closeBlockModal();
        alert("Client blocked successfully!");
      } else {
        alert(response.message || "Failed to block client");
      }
    } catch (error) {
      console.error("Error blocking client:", error);
      alert("Failed to block client. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockClient = async (client) => {
    if (
      !confirm(
        `Are you sure you want to unblock ${client.firstName} ${client.lastName}?`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);

      const response = await unblockClient(client.credentialId);

      if (response.success) {
        // Refresh the clients list
        await fetchClients();
        alert("Client unblocked successfully!");
      } else {
        alert(response.message || "Failed to unblock client");
      }
    } catch (error) {
      console.error("Error unblocking client:", error);
      alert("Failed to unblock client. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDOB = (dobString) => {
    if (!dobString) return "N/A";
    return new Date(dobString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="p-4 sm:ml-64 overflow-hidden">
      <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-500" />
            Client Management
          </h1>
          <div className="text-sm text-gray-500">
            Total: {totalItems} clients
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Total Clients
                </p>
                <p className="text-2xl font-bold text-blue-800">
                  {statistics.total}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  Active Clients
                </p>
                <p className="text-2xl font-bold text-green-800">
                  {statistics.active}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">
                  Blocked Clients
                </p>
                <p className="text-2xl font-bold text-red-800">
                  {statistics.blocked}
                </p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-[#55b3f3] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusFilter("active")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "active"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleStatusFilter("blocked")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "blocked"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Blocked
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin w-8 h-8 text-blue-500" />
            <span className="ml-2 text-gray-500">Loading clients...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No clients found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "No clients have registered yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Profile</th>
                    <th
                      className="px-6 py-3 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("firstName")}
                    >
                      Name
                      {sortBy === "firstName" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("email")}
                    >
                      Email
                      {sortBy === "email" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3">Gender</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">City</th>
                    {/* <th className="px-6 py-3">Contact</th> */}
                    <th
                      className="px-6 py-3 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("createdAt")}
                    >
                      Join Date
                      {sortBy === "createdAt" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr
                      key={client._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <img
                          src={
                            client.profilePicture?.url || "https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg"
                          }
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">
                          {client.firstName}{" "}
                          {client.middleName && `${client.middleName} `}
                          {client.lastName}
                          {client.suffixName && ` ${client.suffixName}`}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-gray-900">{client.email}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {client.userType}
                        </div>
                      </td>
                      <td className="px-6 py-3 capitalize">{client.sex}</td>
                      <td className="px-6 py-3">
                        {client.isBlocked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Ban className="w-3 h-3 mr-1" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">{client.address?.city}</td>
                      {/* <td className="px-6 py-3">{client.contactNumber}</td> */}
                      <td className="px-6 py-3 text-gray-500">
                        {formatDate(client.createdAt)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => viewClientDetails(client)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-[#55b3f3] text-white rounded hover:bg-sky-600 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          {client.isBlocked ? (
                            <button
                              onClick={() => handleUnblockClient(client)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => openBlockModal(client)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Ban className="w-3 h-3" />
                              Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({totalItems} total
                  clients)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const startPage = Math.max(1, currentPage - 2);
                    const pageNum = startPage + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === pageNum
                            ? "bg-blue-500 text-white border-blue-500"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Client Details Modal */}
        {showModal && selectedClient && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#f4f6f6] bg-opacity-50 z-[1000]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  {/* Client Details */}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Profile Section */}
                <div className="flex items-center space-x-4">
                  <img
                    src={
                      selectedClient.profilePicture?.url ||
                      "https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg"
                    }
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedClient.firstName}{" "}
                      {selectedClient.middleName &&
                        `${selectedClient.middleName} `}
                      {selectedClient.lastName}{" "}
                      {selectedClient.suffixName &&
                        ` ${selectedClient.suffixName}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedClient.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500 capitalize">
                        {selectedClient.userType}
                      </p>
                      {selectedClient.isBlocked ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-pointer">
                          <Ban className="w-3 h-3 mr-1" />
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 cursor-pointer">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Block Reason */}
                {selectedClient.isBlocked && selectedClient.blockReason && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-800 mb-1">
                      Block Reason
                    </h4>
                    <p className="text-sm text-red-700">
                      {selectedClient.blockReason}
                    </p>
                    {selectedClient.blockedAt && (
                      <p className="text-xs text-red-600 mt-1">
                        Blocked on: {formatDate(selectedClient.blockedAt)}
                      </p>
                    )}
                  </div>
                )}

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">
                      Personal Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Gender:</span>{" "}
                        <span className="capitalize">{selectedClient.sex}</span>
                      </div>
                      <div>
                        <span className="font-medium">Date of Birth:</span>{" "}
                        {selectedClient.dateOfBirth
                          ? formatDOB(selectedClient.dateOfBirth)
                          : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Age:</span>{" "}
                        {selectedClient.dateOfBirth
                          ? `${calculateAge(
                              selectedClient.dateOfBirth
                            )} years old`
                          : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Marital Status:</span>{" "}
                        <span className="capitalize">
                          {selectedClient.maritalStatus || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">
                      Contact Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {selectedClient.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        {selectedClient.contactNumber}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                {selectedClient.address && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Address</h4>
                    <div className="text-sm text-gray-600">
                      {selectedClient.address.street},{" "}
                      {selectedClient.address.barangay},{" "}
                      {selectedClient.address.city},{" "}
                      {selectedClient.address.province},{" "}
                      {selectedClient.address.region}
                    </div>
                  </div>
                )}

                {/* Account Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Account Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Joined:</span>{" "}
                      {formatDate(selectedClient.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Account ID:</span>{" "}
                      {selectedClient._id}
                    </div>
                    {selectedClient.credentialId && (
                      <div>
                        <span className="font-medium">Credential ID:</span>{" "}
                        {selectedClient.credentialId}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 mt-6">
                {selectedClient.isBlocked ? (
                  <button
                    onClick={() => {
                      handleUnblockClient(selectedClient);
                      closeModal();
                    }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Unblock Client
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      closeModal();
                      openBlockModal(selectedClient);
                    }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Ban className="w-4 h-4" />
                    Block Client
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Block Client Modal */}
        {showBlockModal && blockingClient && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#f4f6f6] bg-opacity-50 z-[1001]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Block Client
                </h2>
                <button
                  onClick={closeBlockModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  You are about to block:
                </p>
                <p className="font-medium text-gray-900">
                  {blockingClient.firstName} {blockingClient.lastName}
                </p>
                <p className="text-sm text-gray-500">{blockingClient.email}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for blocking *
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Please provide a reason for blocking this client..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {blockReason.length}/200 characters
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeBlockModal}
                  disabled={actionLoading}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockClient}
                  disabled={actionLoading || !blockReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  Block Client
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientManagement;
