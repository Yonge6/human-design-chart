# Privacy data map

| Data field | Source | Personal data | Local save | Upload | Upload condition | Database table | Retention | User deletion | Admin access |
|---|---|---:|---|---|---|---|---|---|---|
| Name | Form | Yes | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Until cloud deletion/account deletion | Delete cloud charts and personal data | RLS-authorized admins only |
| Birth date | Form | Yes | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete cloud charts and personal data | RLS-authorized admins only |
| Birth time | Form | Yes | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete cloud charts and personal data | RLS-authorized admins only |
| Location label | Form/search | Yes | Optional local history | Optional; search query also goes to geocoder | Cloud save; geocoder only on user search | `chart_records` | Same as chart; provider policy for search | Delete cloud chart; provider request cannot be deleted here | RLS-authorized admins only |
| Time zone | Derived locally | Potentially | Optional local history | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete cloud charts and personal data | RLS-authorized admins only |
| Coordinates | Geocoder | Potentially | No durable save | Never to Pluto backend | Not applicable | None | In-memory only | Automatic on reload | None |
| HumanDesignProfileSnapshot | Local engine | Sensitive profile | Optional local history | Optional | Cloud-save switch explicitly enabled; stored as `client_asserted` after schema/hash checks | `chart_records` | Until cloud deletion | Delete cloud charts and personal data | RLS-authorized admins only |
| Chart hash/schema/engine versions | Snapshot | Pseudonymous | With chart | Optional | Cloud-save switch explicitly enabled | `chart_records` | Same as chart record | Delete cloud charts and personal data | RLS-authorized admins only |
| Consent choice/version | Settings | Yes/pseudonymous | Local settings | Yes when opted-in action occurs | User enables cloud save or analytics | `consent_records` | Until cloud deletion | Delete cloud charts and personal data | RLS-authorized admins only |
| Strictly enumerated product event | App action | Pseudonymous until deletion | No | Optional | Analytics switch explicitly enabled; Edge and DB value schema pass | `product_events` | At most 180 days | User identifier removed during cloud-personal-data deletion; event then expires by retention | Admin aggregate access only |
| Generated poster | Local renderer | Yes if unmasked | Temporary blob/download | Never | Not uploaded by this project | None | Browser session/Photos library | User deletes local file | None |
| Local history | User device | Yes | Optional, default off | Never unless separate cloud consent | Local-history switch explicitly enabled | Browser/Capacitor storage | Until clear/off/uninstall | Clear local history; turning the switch off asks for confirmation and clears existing records | None |
| Cloud deletion receipt | Delete action | Pseudonymous | No | Generated server-side | User requests cloud deletion | `data_deletion_audit_logs` | At most 365 days | Automatically removed by retention cleanup | No ordinary-user access |

Cloud deletion and local-history deletion are intentionally independent. Cloud deletion removes personal cloud records atomically and deidentifies, rather than falsely claiming to delete, previously recorded product events.
