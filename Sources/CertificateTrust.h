#import <Foundation/Foundation.h>
#import <Security/Security.h>

// This preflight checks system TLS trust for our local identity. Domain-specific
// Apple pinning is handled separately by the existing rule check.
static inline OSStatus WLOCCreateCertificateTrust(NSData *leafDER, NSData *rootDER, SecTrustRef *trust) {
    if (!trust) return errSecParam;
    *trust = NULL;
    SecCertificateRef leaf = leafDER ? SecCertificateCreateWithData(NULL, (__bridge CFDataRef)leafDER) : NULL;
    SecCertificateRef root = rootDER ? SecCertificateCreateWithData(NULL, (__bridge CFDataRef)rootDER) : NULL;
    if (!leaf || !root) {
        if (leaf) CFRelease(leaf);
        if (root) CFRelease(root);
        return errSecDecode;
    }
    SecPolicyRef policy = SecPolicyCreateSSL(true, NULL);
    // Supplying the chain does not make this root trusted. Do not install a
    // custom anchor or trust exception: the user's system trust remains required.
    NSArray *chain = @[(__bridge id)leaf, (__bridge id)root];
    OSStatus status = SecTrustCreateWithCertificates((__bridge CFArrayRef)chain, policy, trust);
    if (status == errSecSuccess) SecTrustSetNetworkFetchAllowed(*trust, false);
    CFRelease(policy);
    CFRelease(root);
    CFRelease(leaf);
    return status;
}

static inline NSError *WLOCCertificateTrustError(NSData *leafDER, NSData *rootDER) {
    SecTrustRef trust = NULL;
    OSStatus status = WLOCCreateCertificateTrust(leafDER, rootDER, &trust);
    if (status != errSecSuccess) return [NSError errorWithDomain:NSOSStatusErrorDomain code:status userInfo:@{NSLocalizedDescriptionKey:@"安装包中的本机证书资源无效，请重新安装 App。"}];
    CFErrorRef failure = NULL;
    BOOL trusted = SecTrustEvaluateWithError(trust, &failure);
    NSError *error = trusted ? nil : (failure ? CFBridgingRelease(failure) : [NSError errorWithDomain:NSOSStatusErrorDomain code:errSecNotTrusted userInfo:nil]);
    CFRelease(trust);
    return error;
}
