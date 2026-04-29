import type { Asset } from "../lib/types";

export function AssetTable({ assets }: { assets: Asset[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Assets</h3>
          <p>Tracked field equipment, procurement state, and serial coverage.</p>
        </div>
      </div>
      {assets.length === 0 ? (
        <div className="empty-state">No assets recorded.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Manufacturer</th>
              <th>Model</th>
              <th>Serial</th>
              <th>Capacity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.asset_type}</td>
                <td>{asset.manufacturer}</td>
                <td>{asset.model}</td>
                <td className="mono-cell">{asset.serial_number}</td>
                <td>{asset.capacity_kw ? `${asset.capacity_kw} kW` : "Unknown"}</td>
                <td>{asset.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
