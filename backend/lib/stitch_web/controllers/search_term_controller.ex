defmodule StitchWeb.SearchTermController do
  use StitchWeb, :controller

  alias Stitch.Accounts
  alias Stitch.Accounts.SearchTerm

  action_fallback(StitchWeb.FallbackController)

  def index(conn, _params) do
    search_term = Accounts.list_search_term()
    render(conn, "index.json", search_term: search_term)
  end

  def create(conn, %{"user_id" => user_id, "search_term" => search_term_params}) do
    with {:ok, %SearchTerm{} = search_term} <-
           Accounts.create_search_term(user_id, search_term_params) do
      StitchWeb.Endpoint.broadcast!("events:" <> Integer.to_string(user_id), "search_terms", %{term: search_term.term, timestamp: search_term.timestamp_integer})

      conn
      |> put_status(:created)
      |> put_resp_header("location", search_term_path(conn, :show, search_term))
      |> render("show.json", search_term: search_term)
    end
  end

  def show(conn, %{"id" => id}) do
    search_term = Accounts.get_search_term(id)
    render(conn, "show.json", search_term: search_term)
  end

  def update(conn, %{"id" => id, "search_term" => search_term_params}) do
    search_term = Accounts.get_search_term!(id)

    with {:ok, %SearchTerm{} = search_term} <-
           Accounts.update_search_term(search_term, search_term_params) do
      render(conn, "show.json", search_term: search_term)
    end
  end

  def delete(conn, %{"id" => id}) do
    search_term = Accounts.get_search_term(id)

    with {:ok, %SearchTerm{}} <- Accounts.delete_search_term(search_term) do
      send_resp(conn, :no_content, "")
    end
  end
end