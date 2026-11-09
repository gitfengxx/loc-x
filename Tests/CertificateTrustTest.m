#import "CertificateTrust.h"

static void Require(BOOL ok, NSString *message) {
    if (!ok) { fprintf(stderr, "FAIL: %s\n", message.UTF8String); exit(1); }
}
int main(int argc, const char **argv) { @autoreleasepool {
    Require(argc == 3, @"usage: certificate-test leaf.der root.der");
    NSData *leaf = [NSData dataWithContentsOfFile:@(argv[1])];
    NSData *root = [NSData dataWithContentsOfFile:@(argv[2])];
    SecTrustRef trust = NULL;
    Require(WLOCCreateCertificateTrust(leaf, root, &trust) == errSecSuccess, @"create production preflight trust");
    SecCertificateRef anchor = SecCertificateCreateWithData(NULL, (__bridge CFDataRef)root);
    // Isolated test only: trust the fixture in memory, never in the system store.
    SecTrustSetAnchorCertificates(trust, (__bridge CFArrayRef)@[(__bridge id)anchor]);
    CFErrorRef error = NULL;
    BOOL ok = SecTrustEvaluateWithError(trust, &error);
    Require(ok, [NSString stringWithFormat:@"trusted local identity must pass preflight without Apple domain pinning: %@", (__bridge id)error]);
    if (error) CFRelease(error);
    SecTrustSetVerifyDate(trust, (__bridge CFDateRef)[NSDate dateWithTimeIntervalSince1970:2208988800]);
    Require(!SecTrustEvaluateWithError(trust, NULL), @"expired identity must fail");
    CFRelease(trust);
    CFRelease(anchor);
    Require(WLOCCertificateTrustError(leaf, root) != nil, @"bundled root must not become a trusted anchor by itself on this clean Mac");
    Require(WLOCCertificateTrustError([NSData data], root) != nil, @"invalid leaf must fail");
    Require(WLOCCertificateTrustError(leaf, nil) != nil, @"missing root must fail");
    puts("PASS: local TLS preflight, expiry, missing resources and untrusted root");
} return 0; }
