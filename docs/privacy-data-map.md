# Privacy data map

| Data field | Source | Personal data | Local save | Upload | Upload condition | Database table | Retention | User deletion | Admin access |
|---|---|---:|---|---|---|---|---|---|---|
| Name | Form | Yes | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Until cloud deletion/account deletion | Delete all cloud data | RLS-authorized admins only |
| Birth date | Form | Yes | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete all cloud data | RLS-authorized admins only |
| Birth time | Form | Yes | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete all cloud data | RLS-authorized admins only |
| Location label | Form/search | Yes | Optional local history | Optional; search query also goes to geocoder | Cloud save; geocoder only on user search | `chart_records` | Same as chart; provider policy for search | Delete cloud chart; provider request cannot be deleted here | RLS-authorized admins only |
| Time zone | Derived locally | Potentially | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete all cloud data | RLS-authorized admins only |
| Coordinates | Geocoder | Potentially | No durable save | Never to Pluto backend | Not applicable | None | In-memory only | Automatic on reload | None |
| HumanDesignProfileSnapshot | Local engine | Sensitive profile | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete all cloud data | RLS-authorized admins only |
| Chart hash/schema/engine versions | Snapshot | Pseudonymous | With chart | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete all cloud data | RLS-authorized admins only |
| Consent choice/version | Settings | Yes/pseudonymous | Local settings | Yes when opted-in action occurs | User enables cloud save or analytics | `consent_records` | Until cloud deletion or policy retention limit | Delete all cloud data | RLS-authorized admins only |
| Allowlisted product event | App action | Pseudonymous | No | Optional | Analytics switch explicitly enabled | `product_events` | Define and publish production retention before enabling | Not part of chart deletion after anonymization; identity is nulled on user deletion | Admin aggregate access only |
| Generated poster | Local renderer | Yes if unmasked | Temporary blob/download | Never | Not uploaded by this project | None | Browser session/Photos library | User deletes local file | None |
| Local history | User device | Yes | Optional, default on | Never unless separate cloud consent | Local-history switch | Browser/Capacitor storage | Until clear/off/uninstall | Clear local history | None |
| Cloud deletion receipt | Delete action | Pseudonymous | No | Generated server-side | User requests cloud deletion | `data_deletion_audit_logs` | Production operator must publish a retention period | Not linked through a reversible user ID | No ordinary-user access |

Cloud deletion and local-history deletion are intentionally independent. Production deployment must publish a concrete event-retention schedule before enabling analytics.
